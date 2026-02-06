import { execute } from '~/utils/db.server';

type SecurityAction =
    | 'login_success'
    | 'login_failed'
    | 'logout'
    | 'password_change'
    | 'mfa_enabled'
    | 'mfa_disabled'
    | 'email_verified'
    | 'account_locked'
    | 'account_deleted';

export async function logSecurityEvent(
    action: SecurityAction,
    userId: number | null,
    request: Request,
    details?: Record<string, any>
): Promise<void> {
    const ipAddress = request.headers.get('x-forwarded-for')
        || request.headers.get('x-real-ip')
        || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await execute(
        `INSERT INTO security_logs (user_id, action, ip_address, user_agent, details) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, action, ipAddress, userAgent, details ? JSON.stringify(details) : null]
    );
}

export function getDeviceInfo(request: Request): string {
    const ua = request.headers.get('user-agent') || '';

    // Parseo simple del user agent
    if (ua.includes('Mobile')) return 'Dispositivo Móvil';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';

    return 'Desconocido';
}

export function getClientIP(request: Request): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}