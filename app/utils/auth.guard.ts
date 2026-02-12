// app/utils/auth.guard.ts

import { redirect } from 'react-router';
import {
    getSession,
    commitSession,
    type AppSession
} from './sessions.server';
import {
    verifyAccessToken,
    getUserById,
    type TokenPayload,
    type User
} from './auth.server';
import { refreshTokensIfNeeded } from './token-refresh.server';

// =====================
// TIPOS
// =====================

export interface AuthenticatedUser {
    id: number;
    email: string;
    role: string;
    fullName: string;
    mfaEnabled: boolean;
}

export interface AuthGuardResult {
    user: AuthenticatedUser;
    token: string;
    headers?: HeadersInit;
}

// =====================
// GUARD PRINCIPAL
// =====================

export async function requireAuth(
    request: Request
): Promise<AuthGuardResult> {
    // Intentar refrescar tokens automáticamente
    const { session, needsCommit } = await refreshTokensIfNeeded(request);
    const accessToken = session.get('accessToken');

    if (!accessToken) {
        throw redirect('/auth/login');
    }

    const payload = verifyAccessToken(accessToken);

    if (!payload) {
        throw redirect('/auth/login?expired=true');
    }

    // Verificar MFA si está habilitado pero no verificado
    if (payload.mfaVerified === false) {
        throw redirect('/auth/login?step=mfa');
    }

    const user = await getUserById(payload.id);

    if (!user) {
        throw redirect('/auth/login');
    }

    if (!user.is_verified) {
        throw redirect('/auth/verify-email?pending=true');
    }

    const result: AuthGuardResult = {
        user: {
            id: user.id,
            email: user.email,
            role: payload.role || 'user',
            fullName: user.full_name,
            mfaEnabled: Boolean(user.mfa_enabled)
        },
        token: accessToken
    };

    // Incluir headers si se refrescaron tokens
    if (needsCommit) {
        result.headers = {
            "Set-Cookie": await commitSession(session)
        };
    }

    return result;
}

// =====================
// GUARD PARA RUTAS PÚBLICAS
// =====================

export async function redirectIfAuthenticated(
    request: Request
): Promise<null> {
    const session = await getSession(request.headers.get("Cookie"));
    const accessToken = session.get('accessToken');

    if (accessToken) {
        const payload = verifyAccessToken(accessToken);
        if (payload) {
            throw redirect('/dashboard');
        }
    }

    return null;
}

// =====================
// GUARD PARA ROLES
// =====================

export async function requireRole(
    request: Request,
    ...roles: string[]
): Promise<AuthGuardResult> {
    const auth = await requireAuth(request);

    if (!roles.includes(auth.user.role)) {
        throw redirect('/dashboard?error=unauthorized');
    }

    return auth;
}

// Alias para admin
export async function requireAdmin(
    request: Request
): Promise<AuthGuardResult> {
    return requireRole(request, 'admin');
}

// =====================
// GUARD PARA APIs
// =====================

export async function requireAuthAPI(
    request: Request
): Promise<AuthGuardResult> {
    const session = await getSession(request.headers.get("Cookie"));
    const accessToken = session.get('accessToken');

    if (!accessToken) {
        throw new Response(
            JSON.stringify({ error: 'No autenticado' }),
            {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    const payload = verifyAccessToken(accessToken);

    if (!payload) {
        throw new Response(
            JSON.stringify({ error: 'Token expirado' }),
            {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    const user = await getUserById(payload.id);

    if (!user) {
        throw new Response(
            JSON.stringify({ error: 'Usuario no encontrado' }),
            {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    return {
        user: {
            id: user.id,
            email: user.email,
            role: payload.role || 'user',
            fullName: user.full_name,
            mfaEnabled: Boolean(user.mfa_enabled)
        },
        token: accessToken
    };
}

// =====================
// HELPER PARA USUARIO OPCIONAL
// =====================

export async function getOptionalUser(
    request: Request
): Promise<AuthenticatedUser | null> {
    try {
        const auth = await requireAuth(request);
        return auth.user;
    } catch {
        return null;
    }
}