// app/services/cleanup.server.ts

import { execute } from '~/utils/db.server';

export interface CleanupResult {
    expiredRefreshTokens: number;
    expiredVerifications: number;
    expiredResets: number;
    expiredRateLimits: number;
    oldSecurityLogs: number;
    timestamp: string;
}

export async function runCleanupTasks(): Promise<CleanupResult> {
    const [
        refreshTokens,
        verifications,
        resets,
        rateLimits,
        securityLogs
    ] = await Promise.all([
        // Refresh tokens expirados o revocados hace más de 7 días
        execute(
            `DELETE FROM refresh_tokens 
             WHERE expires_at < NOW() 
                OR (revoked = TRUE 
                    AND revoked_at < DATE_SUB(NOW(), INTERVAL 7 DAY))`
        ),

        // Verificaciones de email expiradas o usadas
        execute(
            `DELETE FROM email_verifications 
             WHERE expires_at < NOW() OR used = TRUE`
        ),

        // Password resets expirados o usados
        execute(
            `DELETE FROM password_resets 
             WHERE expires_at < NOW() OR used = TRUE`
        ),

        // Rate limits expirados
        execute(
            'DELETE FROM rate_limits WHERE expire_at < NOW()'
        ),

        // Security logs mayores a 90 días (mantener para auditoría reciente)
        execute(
            `DELETE FROM security_logs 
             WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)`
        )
    ]);

    return {
        expiredRefreshTokens: refreshTokens.affectedRows,
        expiredVerifications: verifications.affectedRows,
        expiredResets: resets.affectedRows,
        expiredRateLimits: rateLimits.affectedRows,
        oldSecurityLogs: securityLogs.affectedRows,
        timestamp: new Date().toISOString()
    };
}

// Limpiar historial de contraseñas excedente para todos los usuarios
export async function cleanupPasswordHistory(
    maxPerUser: number = 5
): Promise<number> {
    const result = await execute(
        `DELETE ph FROM password_history ph
         WHERE ph.id NOT IN (
             SELECT id FROM (
                 SELECT id FROM password_history ph2
                 WHERE ph2.user_id = ph.user_id
                 ORDER BY ph2.created_at DESC
                 LIMIT ?
             ) AS recent
         )`,
        [maxPerUser]
    );

    return result.affectedRows;
}