// app/utils/sessions.server.ts

import { createCookieSessionStorage, type Session } from "react-router";

// Tipos de datos de sesión
export interface SessionData {
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
    auth_pending_user_id: number;
}

export interface SessionFlashData {
    error: string;
    success: string;
}

export type AppSession = Session<SessionData, SessionFlashData>;

// Validar secreto
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    throw new Error(
        "SESSION_SECRET debe estar definido en las variables de entorno"
    );
}

const isProduction = process.env.NODE_ENV === 'production';

export const { getSession, commitSession, destroySession } =
    createCookieSessionStorage<SessionData, SessionFlashData>({
        cookie: {
            name: "__session",
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 días
            secrets: [sessionSecret],
            secure: isProduction,
            domain: isProduction
                ? process.env.COOKIE_DOMAIN
                : undefined,
        },
    });

// Helper para obtener sesión desde request
export async function getSessionFromRequest(
    request: Request
): Promise<AppSession> {
    return getSession(request.headers.get("Cookie"));
}

// Helper para crear headers con sesión
export async function createSessionHeaders(
    session: AppSession
): Promise<Record<string, string>> {
    return {
        "Set-Cookie": await commitSession(session)
    };
}