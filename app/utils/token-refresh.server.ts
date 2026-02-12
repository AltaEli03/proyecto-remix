// app/utils/token-refresh.server.ts

import {
    getSession,
    commitSession,
    type AppSession
} from "./sessions.server";
import {
    verifyAccessToken,
    verifyRefreshToken,
    validateRefreshToken,
    detectTokenReuse,
    generateTokens,
    storeRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    getUserById
} from "./auth.server";
import {
    getClientIP,
    getDeviceInfo,
    logSecurityEvent
} from "~/services/security.server";

export async function refreshTokensIfNeeded(request: Request): Promise<{
    session: AppSession;
    needsCommit: boolean;
}> {
    const session = await getSession(request.headers.get("Cookie"));
    const accessToken = session.get("accessToken");
    const refreshToken = session.get("refreshToken");

    // Si no hay tokens, no hacer nada
    if (!accessToken || !refreshToken) {
        return { session, needsCommit: false };
    }

    // Si el access token es válido, no hacer nada
    const accessPayload = verifyAccessToken(accessToken);
    if (accessPayload) {
        return { session, needsCommit: false };
    }

    // Access token expirado - intentar renovar
    const refreshPayload = verifyRefreshToken(refreshToken);

    if (!refreshPayload) {
        session.unset("accessToken");
        session.unset("refreshToken");
        return { session, needsCommit: true };
    }

    // Detectar reutilización de token (posible robo)
    const isReused = await detectTokenReuse(
        refreshPayload.id,
        refreshToken
    );

    if (isReused) {
        // Revocar TODAS las sesiones del usuario por seguridad
        await revokeAllUserTokens(refreshPayload.id);
        await logSecurityEvent(
            'suspicious_activity',
            refreshPayload.id,
            request,
            { reason: 'refresh_token_reuse' }
        );

        session.unset("accessToken");
        session.unset("refreshToken");
        return { session, needsCommit: true };
    }

    // Validar que el refresh token existe en la DB y no está revocado
    const isValid = await validateRefreshToken(
        refreshPayload.id,
        refreshToken
    );

    if (!isValid) {
        session.unset("accessToken");
        session.unset("refreshToken");
        return { session, needsCommit: true };
    }

    // Obtener usuario
    const user = await getUserById(refreshPayload.id);

    if (!user) {
        session.unset("accessToken");
        session.unset("refreshToken");
        return { session, needsCommit: true };
    }

    // Generar nuevos tokens (rotación de refresh token)
    const newTokens = generateTokens(user, {
        mfaVerified: true,
        existingFamily: refreshPayload.family
    });

    // Revocar el refresh token anterior
    await revokeRefreshToken(refreshToken);

    // Guardar el nuevo refresh token
    const deviceInfo = getDeviceInfo(request);
    const ipAddress = getClientIP(request);
    await storeRefreshToken(user.id, newTokens.refreshToken, {
        deviceInfo,
        ipAddress,
        family: newTokens.refreshFamily
    });

    // Actualizar sesión
    session.set("accessToken", newTokens.accessToken);
    session.set("refreshToken", newTokens.refreshToken);

    await logSecurityEvent('token_refreshed', user.id, request);

    return { session, needsCommit: true };
}