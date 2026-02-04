import { redirect } from 'react-router';
import { getSessionFromRequest } from './sessions.server';
import { verifyAccessToken, getUserById, type TokenPayload } from './auth.server';


// TIPOS

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
}

// GUARD PRINCIPAL

export async function requireAuth(request: Request): Promise<AuthGuardResult> {
    const session = await getSessionFromRequest(request);
    const accessToken = session.get('accessToken');

    if (!accessToken) {
        throw redirect('/auth/login');
    }

    const payload = verifyAccessToken(accessToken);

    if (!payload) {
        throw redirect('/auth/login?expired=true');
    }

    const user = await getUserById(payload.id);

    if (!user) {
        throw redirect('/auth/login');
    }

    if (!user.is_verified) {
        throw redirect('/auth/verify-email?pending=true');
    }

    return {
        user: {
            id: user.id,
            email: user.email,
            role: 'user',
            fullName: user.full_name,
            mfaEnabled: Boolean(user.mfa_enabled)
        },
        token: accessToken
    };
}

// GUARD PARA RUTAS PÚBLICAS

// Redirige a dashboard si ya está autenticado
export async function redirectIfAuthenticated(request: Request): Promise<null> {
    const session = await getSessionFromRequest(request);
    const accessToken = session.get('accessToken');

    if (accessToken) {
        const payload = verifyAccessToken(accessToken);
        if (payload) {
            throw redirect('/dashboard');
        }
    }

    return null;
}

// GUARD PARA ADMIN

export async function requireAdmin(request: Request): Promise<AuthGuardResult> {
    const auth = await requireAuth(request);

    if (auth.user.role !== 'admin') {
        throw redirect('/dashboard?error=unauthorized');
    }

    return auth;
}

// HELPER PARA OBTENER USUARIO OPCIONAL

export async function getOptionalUser(request: Request): Promise<AuthenticatedUser | null> {
    try {
        const auth = await requireAuth(request);
        return auth.user;
    } catch {
        return null;
    }
}

