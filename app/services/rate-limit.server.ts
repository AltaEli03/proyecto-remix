// app/services/rate-limit.server.ts

import { queryOne, execute } from '~/utils/db.server';
import { RateLimitError } from '~/utils/errors.server';

// =====================
// CONFIGURACIÓN
// =====================

const RATE_LIMITS = {
    login: { maxAttempts: 5, windowSeconds: 900 },
    register: { maxAttempts: 3, windowSeconds: 3600 },
    passwordReset: { maxAttempts: 3, windowSeconds: 3600 },
    mfa: { maxAttempts: 5, windowSeconds: 300 },
    emailVerification: { maxAttempts: 5, windowSeconds: 3600 },
    changePassword: { maxAttempts: 3, windowSeconds: 3600 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

// =====================
// FUNCIONES
// =====================

export async function checkRateLimit(
    action: RateLimitAction,
    identifier: string
): Promise<void> {
    const config = RATE_LIMITS[action];
    const key = `${action}:${identifier}`;

    // Limpiar expirados
    await execute('DELETE FROM rate_limits WHERE expire_at < NOW()');

    const existing = await queryOne<{
        points: number;
        expire_at: Date;
    }>(
        'SELECT points, expire_at FROM rate_limits WHERE `key` = ?',
        [key]
    );

    if (!existing) {
        // Primer intento - crear registro
        const expireAt = new Date(
            Date.now() + config.windowSeconds * 1000
        );
        await execute(
            'INSERT INTO rate_limits (`key`, points, expire_at) VALUES (?, 1, ?)',
            [key, expireAt]
        );
        return;
    }

    if (existing.points >= config.maxAttempts) {
        const retryAfter = Math.ceil(
            (new Date(existing.expire_at).getTime() - Date.now()) / 1000
        );
        throw new RateLimitError(Math.max(retryAfter, 1));
    }

    await execute(
        'UPDATE rate_limits SET points = points + 1 WHERE `key` = ?',
        [key]
    );
}

export async function resetRateLimit(
    action: RateLimitAction,
    identifier: string
): Promise<void> {
    const key = `${action}:${identifier}`;
    await execute('DELETE FROM rate_limits WHERE `key` = ?', [key]);
}

export async function getRateLimitRemaining(
    action: RateLimitAction,
    identifier: string
): Promise<number> {
    const config = RATE_LIMITS[action];
    const key = `${action}:${identifier}`;

    const existing = await queryOne<{ points: number }>(
        'SELECT points FROM rate_limits WHERE `key` = ? AND expire_at > NOW()',
        [key]
    );

    if (!existing) return config.maxAttempts;
    return Math.max(0, config.maxAttempts - existing.points);
}