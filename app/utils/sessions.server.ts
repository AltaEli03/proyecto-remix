import { createCookieSessionStorage } from "react-router";

// Validar que tengamos el secreto
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    throw new Error("SESSION_SECRET debe estar definido en las variables de entorno");
}

export const { getSession, commitSession, destroySession } =
    createCookieSessionStorage({
        cookie: {
            name: "__session",
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 días
            secrets: [sessionSecret],
        },
    });

// Helper para obtener sesión desde request
export async function getSessionFromRequest(request: Request) {
    return getSession(request.headers.get("Cookie"));
}

// Helper para crear headers con sesión
export async function createSessionHeaders(session: any) {
    return {
        "Set-Cookie": await commitSession(session)
    };
}