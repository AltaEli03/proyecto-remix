// app/services/security.server.ts

import { execute, query } from '~/utils/db.server';

// =====================
// TIPOS
// =====================

export type SecurityAction =
    | 'login_success'
    | 'login_failed'
    | 'logout'
    | 'password_change'
    | 'password_reset_requested'
    | 'password_reset_completed'
    | 'mfa_enabled'
    | 'mfa_disabled'
    | 'mfa_backup_used'
    | 'email_verified'
    | 'account_locked'
    | 'account_unlocked'
    | 'account_deleted'
    | 'registration_initiated'
    | 'registration_completed'
    | 'token_refreshed'
    | 'suspicious_activity';

export interface ActiveSession {
    id: number;
    device_info: string | null;
    ip_address: string | null;
    created_at: Date;
}

export interface SecurityLogEntry {
    id: number;
    action: SecurityAction;
    ip_address: string | null;
    user_agent: string | null;
    details: string | null;
    created_at: Date;
}

// =====================
// LOGGING
// =====================

export async function logSecurityEvent(
    action: SecurityAction,
    userId: number | null,
    request: Request,
    details?: Record<string, unknown>
): Promise<void> {
    try {
        const ipAddress = getClientIP(request);
        const userAgent = request.headers.get('user-agent') || 'unknown';

        await execute(
            `INSERT INTO security_logs 
             (user_id, action, ip_address, user_agent, details) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                action,
                ipAddress,
                userAgent,
                details ? JSON.stringify(details) : null
            ]
        );
    } catch (error) {
        // Nunca dejar que el logging rompa el flujo principal
        console.error('Error logging security event:', error);
    }
}

// =====================
// DETECCIÓN DE ACTIVIDAD SOSPECHOSA
// =====================

export async function detectSuspiciousActivity(
    userId: number,
    request: Request
): Promise<{
    suspicious: boolean;
    reasons: string[];
}> {
    const ipAddress = getClientIP(request);
    const reasons: string[] = [];

    // 1. Verificar logins fallidos recientes desde diferentes IPs
    const recentFailures = await query<{ ip_address: string }>(
        `SELECT DISTINCT ip_address 
         FROM security_logs 
         WHERE user_id = ? 
           AND action = 'login_failed' 
           AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [userId]
    );

    if (recentFailures.length >= 3) {
        reasons.push('multiple_ips_failed_login');
    }

    // 2. Verificar login desde nueva ubicación
    const knownIPs = await query<{ ip_address: string }>(
        `SELECT DISTINCT ip_address 
         FROM security_logs 
         WHERE user_id = ? 
           AND action = 'login_success' 
           AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [userId]
    );

    const isNewIP = !knownIPs.some(k => k.ip_address === ipAddress);

    if (isNewIP && knownIPs.length > 0) {
        reasons.push('new_ip_login');
    }

    // 3. Verificar múltiples cambios de contraseña recientes
    const recentPasswordChanges = await query<{ id: number }>(
        `SELECT id FROM security_logs 
         WHERE user_id = ? 
           AND action = 'password_change' 
           AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        [userId]
    );

    if (recentPasswordChanges.length >= 2) {
        reasons.push('frequent_password_changes');
    }

    const suspicious = reasons.length > 0;

    if (suspicious) {
        await logSecurityEvent(
            'suspicious_activity',
            userId,
            request,
            {
                reasons,
                currentIP: ipAddress,
                knownIPs: knownIPs.map(k => k.ip_address)
            }
        );
    }

    return { suspicious, reasons };
}

// =====================
// SESIONES ACTIVAS
// =====================

export async function getActiveSessions(
    userId: number
): Promise<ActiveSession[]> {
    return query<ActiveSession>(
        `SELECT id, device_info, ip_address, created_at 
         FROM refresh_tokens 
         WHERE user_id = ? 
           AND revoked = FALSE 
           AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [userId]
    );
}

export async function revokeSession(
    userId: number,
    sessionId: number
): Promise<boolean> {
    const result = await execute(
        `UPDATE refresh_tokens 
         SET revoked = TRUE, revoked_at = NOW() 
         WHERE id = ? AND user_id = ?`,
        [sessionId, userId]
    );
    return result.affectedRows > 0;
}

// =====================
// HISTORIAL DE SEGURIDAD
// =====================

export async function getSecurityHistory(
    userId: number,
    limit: number = 20
): Promise<SecurityLogEntry[]> {
    return query<SecurityLogEntry>(
        `SELECT id, action, ip_address, user_agent, details, created_at 
         FROM security_logs 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
    );
}

// =====================
// DEVICE INFO Y CLIENT IP
// =====================

export function getDeviceInfo(request: Request): string {
    const ua = request.headers.get('user-agent') || '';
    const parts: string[] = [];

    // Browser
    if (ua.includes('Firefox')) parts.push('Firefox');
    else if (ua.includes('Edg/')) parts.push('Edge');
    else if (ua.includes('OPR') || ua.includes('Opera')) parts.push('Opera');
    else if (ua.includes('Chrome')) parts.push('Chrome');
    else if (ua.includes('Safari')) parts.push('Safari');
    else parts.push('Navegador desconocido');

    // OS
    if (ua.includes('iPhone')) parts.push('iPhone');
    else if (ua.includes('iPad')) parts.push('iPad');
    else if (ua.includes('Android')) parts.push('Android');
    else if (ua.includes('Windows NT 10') || ua.includes('Windows NT 11')) {
        parts.push('Windows 10+');
    }
    else if (ua.includes('Windows')) parts.push('Windows');
    else if (ua.includes('Mac OS X')) parts.push('macOS');
    else if (ua.includes('CrOS')) parts.push('ChromeOS');
    else if (ua.includes('Linux')) parts.push('Linux');

    // Tipo de dispositivo
    if (ua.includes('Mobile')) parts.push('📱');
    else if (ua.includes('Tablet')) parts.push('📱');
    else parts.push('💻');

    return parts.join(' · ');
}

export function getClientIP(request: Request): string {
    // Cloudflare
    const cfIP = request.headers.get('cf-connecting-ip');
    if (cfIP) return cfIP.trim();

    // Standard proxy
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const firstIP = forwarded.split(',')[0].trim();
        if (/^[\d.:a-fA-F]+$/.test(firstIP)) {
            return firstIP;
        }
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP.trim();

    return 'unknown';
}