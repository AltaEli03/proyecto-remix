// app/utils/csrf.server.ts

import crypto from 'crypto';
import { getSession, commitSession, type AppSession } from './sessions.server';

export function generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export async function getCSRFToken(request: Request): Promise<{
    token: string;
    session: AppSession;
    needsCommit: boolean;
}> {
    const session = await getSession(request.headers.get('Cookie'));
    let token = session.get('csrfToken');
    let needsCommit = false;

    if (!token) {
        token = generateCSRFToken();
        session.set('csrfToken', token);
        needsCommit = true;
    }

    return { token, session, needsCommit };
}

export async function validateCSRFToken(request: Request): Promise<boolean> {
    const session = await getSession(request.headers.get('Cookie'));
    const sessionToken = session.get('csrfToken');

    // Clonar request para no consumir el body
    const clonedRequest = request.clone();
    const formData = await clonedRequest.formData();
    const formToken = formData.get('_csrf') as string;

    if (!sessionToken || !formToken) return false;

    // Asegurar que ambos tienen la misma longitud antes de comparar
    if (sessionToken.length !== formToken.length) return false;

    // Comparación de tiempo constante para evitar timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(sessionToken, 'utf-8'),
            Buffer.from(formToken, 'utf-8')
        );
    } catch {
        return false;
    }
}

// Middleware helper para actions
export async function requireCSRF(request: Request): Promise<void> {
    const isValid = await validateCSRFToken(request);
    if (!isValid) {
        throw new Response('Invalid CSRF token', { status: 403 });
    }
}