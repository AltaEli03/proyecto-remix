import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateSecret, generateURI, verify } from "otplib";
import { query, queryOne, execute, transaction } from './db.server';
import type { PoolConnection } from 'mariadb';

// CONFIGURACIÓN

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET y JWT_REFRESH_SECRET deben estar definidos");
}

// Configurar otplib
const TOTP_DEFAULTS = {
    digits: 6,
    period: 30,
    epochTolerance: 30,
} as const;
// TIPOS

export interface User {
    id: number;
    email: string;
    password_hash: string;
    full_name: string;
    is_verified: boolean;
    mfa_enabled: boolean;
    mfa_secret: string | null;
    failed_login_attempts: number;
    locked_until: Date | null;
}

export interface TokenPayload {
    id: number;
    email: string;
    role: string;
    mfaVerified?: boolean;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

// HASHING DE CONTRASEÑAS

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// Hash para tokens (más rápido, para tokens de un solo uso)
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// GENERACIÓN DE TOKENS SEGUROS

export function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// JWT TOKENS

export function generateTokens(user: User): AuthTokens {
    const accessToken = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: 'user',
            mfaVerified: user.mfa_enabled ? true : undefined
        } as TokenPayload,
        JWT_SECRET!,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET!) as TokenPayload;
    } catch {
        return null;
    }
}

export function verifyRefreshToken(token: string): { id: number } | null {
    try {
        const payload = jwt.verify(token, JWT_REFRESH_SECRET!) as { id: number; type: string };
        if (payload.type !== 'refresh') return null;
        return { id: payload.id };
    } catch {
        return null;
    }
}

// GESTIÓN DE REFRESH TOKENS EN DB

export async function storeRefreshToken(
    userId: number,
    token: string,
    deviceInfo?: string,
    ipAddress?: string
): Promise<void> {
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    await execute(
        `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, tokenHash, deviceInfo || null, ipAddress || null, expiresAt]
    );
}

export async function validateRefreshToken(userId: number, token: string): Promise<boolean> {
    const tokenHash = hashToken(token);

    const result = await queryOne<{ id: number }>(
        `SELECT id FROM refresh_tokens 
         WHERE user_id = ? AND token_hash = ? AND revoked = FALSE AND expires_at > NOW()`,
        [userId, tokenHash]
    );

    return result !== null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    await execute(
        `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE token_hash = ?`,
        [tokenHash]
    );
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
    await execute(
        `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE user_id = ?`,
        [userId]
    );
}

// Limpiar tokens expirados (ejecutar periódicamente)
export async function cleanupExpiredTokens(): Promise<void> {
    await execute(
        `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE`
    );
}

// MFA (TOTP)

export function generateMFASecret(): string {
    return generateSecret();
}

export function generateMFAUri(secret: string, email: string, issuer = "Remix App"): string {
    return generateURI({
        issuer,
        label: email,
        secret,
        digits: TOTP_DEFAULTS.digits,
        period: TOTP_DEFAULTS.period,
    });
}

export async function verifyMFAToken(token: string, secret: string): Promise<boolean> {
    try {
        const result = await verify({
            secret,
            token,
            ...TOTP_DEFAULTS,
        });
        return result.valid;
    } catch {
        return false;
    }
}

export function generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        // Formato: XXXX-XXXX
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
}

export async function storeBackupCodes(userId: number, codes: string[]): Promise<void> {
    // Eliminar códigos anteriores
    await execute('DELETE FROM mfa_backup_codes WHERE user_id = ?', [userId]);

    // Insertar nuevos códigos hasheados
    for (const code of codes) {
        const codeHash = hashToken(code.replace('-', '').toLowerCase());
        await execute(
            'INSERT INTO mfa_backup_codes (user_id, code_hash) VALUES (?, ?)',
            [userId, codeHash]
        );
    }
}

export async function verifyBackupCode(userId: number, code: string): Promise<boolean> {
    const codeHash = hashToken(code.replace('-', '').toLowerCase());

    const result = await queryOne<{ id: number }>(
        'SELECT id FROM mfa_backup_codes WHERE user_id = ? AND code_hash = ? AND used = FALSE',
        [userId, codeHash]
    );

    if (result) {
        // Marcar como usado
        await execute(
            'UPDATE mfa_backup_codes SET used = TRUE, used_at = NOW() WHERE id = ?',
            [result.id]
        );
        return true;
    }

    return false;
}

// USUARIOS

export async function getUserByEmail(email: string): Promise<User | null> {
    return queryOne<User>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
}

export async function getUserById(id: number): Promise<User | null> {
    return queryOne<User>('SELECT * FROM users WHERE id = ?', [id]);
}

export async function createUser(
    email: string,
    password: string,
    fullName: string
): Promise<number> {
    const hashedPassword = await hashPassword(password);

    const result = await execute(
        'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
        [email.toLowerCase(), hashedPassword, fullName]
    );

    return result.insertId;
}

export async function verifyUserEmail(userId: number): Promise<void> {
    await execute('UPDATE users SET is_verified = TRUE WHERE id = ?', [userId]);
}

// BLOQUEO DE CUENTA

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export async function incrementFailedAttempts(userId: number): Promise<boolean> {
    const user = await getUserById(userId);
    if (!user) return false;

    const newAttempts = user.failed_login_attempts + 1;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        // Bloquear cuenta
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        await execute(
            'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
            [newAttempts, lockUntil, userId]
        );
        return true; // Cuenta bloqueada
    }

    await execute(
        'UPDATE users SET failed_login_attempts = ? WHERE id = ?',
        [newAttempts, userId]
    );
    return false;
}

export async function resetFailedAttempts(userId: number): Promise<void> {
    await execute(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
        [userId]
    );
}

export function isAccountLocked(user: User): boolean {
    if (!user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
}

// VERIFICACIÓN DE EMAIL

export async function createEmailVerification(userId: number): Promise<string> {
    // Eliminar verificaciones anteriores
    await execute('DELETE FROM email_verifications WHERE user_id = ?', [userId]);

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    await execute(
        'INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [userId, tokenHash, expiresAt]
    );

    return token;
}

export async function validateEmailVerification(token: string): Promise<number | null> {
    const tokenHash = hashToken(token);

    const result = await queryOne<{ user_id: number }>(
        `SELECT user_id FROM email_verifications 
         WHERE token_hash = ? AND expires_at > NOW() AND used = FALSE`,
        [tokenHash]
    );

    if (result) {
        await execute(
            'UPDATE email_verifications SET used = TRUE WHERE token_hash = ?',
            [tokenHash]
        );
        return result.user_id;
    }

    return null;
}

// RESET DE CONTRASEÑA

export async function createPasswordReset(userId: number): Promise<string> {
    await execute('DELETE FROM password_resets WHERE user_id = ?', [userId]);

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await execute(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [userId, tokenHash, expiresAt]
    );

    return token;
}

export async function validatePasswordReset(token: string): Promise<number | null> {
    // ✅ Validar que el token no esté vacío
    if (!token || token.trim() === '') {
        return null;
    }

    const tokenHash = hashToken(token);

    try {
        const result = await queryOne<{ user_id: number; expires_at: Date }>(
            `SELECT user_id, expires_at FROM password_resets 
             WHERE token_hash = ? AND used = FALSE`,
            [tokenHash]
        );

        if (!result) {
            return null;
        }

        // ✅ Verificar expiración manualmente para mejor debug
        const now = new Date();
        const expiresAt = new Date(result.expires_at);

        if (expiresAt <= now) {
            return null;
        }

        return result.user_id;
    } catch (error) {
        console.error('Error en validatePasswordReset:', error);
        throw error; // Re-lanzar para que el loader lo capture
    }
}

export async function completePasswordReset(token: string, newPassword: string): Promise<boolean> {
    // ✅ Validar inputs
    if (!token || !newPassword) {
        return false;
    }

    try {
        const userId = await validatePasswordReset(token);
        if (!userId) {
            return false;
        }

        const tokenHash = hashToken(token);
        const hashedPassword = await hashPassword(newPassword);

        // ✅ Usar transacción para asegurar consistencia
        await execute('START TRANSACTION');

        try {
            // Actualizar contraseña
            await execute(
                'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
                [hashedPassword, userId]
            );

            // Marcar token como usado
            await execute(
                'UPDATE password_resets SET used = TRUE WHERE token_hash = ?',
                [tokenHash]
            );

            // Invalidar todas las sesiones
            await revokeAllUserTokens(userId);

            await execute('COMMIT');
            return true;
        } catch (error) {
            await execute('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error en completePasswordReset:', error);
        return false;
    }
}

export interface BackupCodeInfo {
    id: number;
    used: boolean;
    used_at: Date | null;
    created_at: Date;
}

export interface BackupCodesStats {
    total: number;
    used: number;
    remaining: number;
    codes: BackupCodeInfo[];
    createdAt: Date | null;
}

export async function getBackupCodesStats(userId: number): Promise<BackupCodesStats> {
    const codes = await query<BackupCodeInfo>(
        `SELECT id, used, used_at, created_at 
         FROM mfa_backup_codes 
         WHERE user_id = ? 
         ORDER BY used ASC, id ASC`,
        [userId]
    );

    const used = codes.filter(c => c.used).length;

    return {
        total: codes.length,
        used,
        remaining: codes.length - used,
        codes,
        createdAt: codes.length > 0 ? codes[0].created_at : null
    };
}

export async function regenerateBackupCodes(userId: number): Promise<string[]> {
    // Eliminar códigos anteriores
    await execute(
        "DELETE FROM mfa_backup_codes WHERE user_id = ?",
        [userId]
    );

    // Generar nuevos códigos
    const newCodes = generateBackupCodes(10);

    // Guardar los nuevos códigos
    await storeBackupCodes(userId, newCodes);

    return newCodes;
}

export async function registerUserAtomic(
    email: string,
    password: string,
    name: string,
    request: Request
): Promise<{ userId: number; verificationToken: string }> {

    return await transaction(async (conn: PoolConnection) => {
        // 1. Verificar que el email no exista
        const existingUser = await conn.query(
            'SELECT id FROM users WHERE email = ? FOR UPDATE',
            [email]
        );

        if (existingUser.length > 0) {
            throw new Error('EMAIL_EXISTS');
        }

        // 2. Hash de la contraseña
        const hashedPassword = await hashPassword(password);

        // 3. Crear usuario
        const userResult = await conn.query(
            `INSERT INTO users (email, password_hash, full_name, is_verified, created_at, updated_at)
             VALUES (?, ?, ?, false, NOW(), NOW())`,
            [email, hashedPassword, name]
        );
        const userId = userResult.insertId;

        // 4. Crear token de verificación
        const verificationToken = crypto.randomUUID();
        const tokenHash = hashToken(verificationToken);  // ✅ Hashear el token
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await conn.query(
            `INSERT INTO email_verifications (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,  // ✅ Usar token_hash y quitar created_at (tiene default)
            [userId, tokenHash, expiresAt]
        );

        // 5. Registrar evento de seguridad
        const ipAddress = request.headers.get('x-forwarded-for')
            || request.headers.get('x-real-ip')
            || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        await conn.query(
            `INSERT INTO security_logs (user_id, action, ip_address, user_agent, details) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                'registration_initiated',
                ipAddress,
                userAgent,
                JSON.stringify({ step: 'user_created' })
            ]
        );

        return { userId, verificationToken };
    });


}

// auth.server.ts - Añadir esta función

export async function deleteUserAccount(userId: number): Promise<void> {
    await transaction(async (conn: PoolConnection) => {
        // Eliminar en orden correcto por las foreign keys

        // 1. Eliminar refresh tokens
        await conn.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);

        // 2. Eliminar backup codes MFA
        await conn.query('DELETE FROM mfa_backup_codes WHERE user_id = ?', [userId]);

        // 3. Eliminar verificaciones de email
        await conn.query('DELETE FROM email_verifications WHERE user_id = ?', [userId]);

        // 4. Eliminar password resets
        await conn.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);

        // 5. Anonimizar security logs (mantener para auditoría pero sin vincular al usuario)
        await conn.query(
            `UPDATE security_logs 
             SET user_id = NULL, 
                 details = JSON_SET(COALESCE(details, '{}'), '$.deleted_user_id', ?) 
             WHERE user_id = ?`,
            [userId, userId]
        );

        // 6. Finalmente eliminar el usuario
        await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    });
}