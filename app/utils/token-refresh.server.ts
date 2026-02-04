import { redirect } from "react-router";
import { getSession, commitSession } from "./sessions.server";
import {
    verifyAccessToken,
    verifyRefreshToken,
    validateRefreshToken,
    generateTokens,
    storeRefreshToken,
    revokeRefreshToken,
    getUserById
} from "./auth.server";
import { getClientIP, getDeviceInfo } from "~/services/security.server";

export async function refreshTokensIfNeeded(request: Request): Promise<{
    session: any;
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

    // Access token expirado - intentar renovar con refresh token
    const refreshPayload = verifyRefreshToken(refreshToken);

    if (!refreshPayload) {
        // Refresh token inválido - limpiar sesión
        session.unset("accessToken");
        session.unset("refreshToken");
        return { session, needsCommit: true };
    }

    // Validar que el refresh token existe en la DB y no está revocado
    const isValid = await validateRefreshToken(refreshPayload.id, refreshToken);

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
    const newTokens = generateTokens(user);

    // Revocar el refresh token anterior
    await revokeRefreshToken(refreshToken);

    // Guardar el nuevo refresh token
    const deviceInfo = getDeviceInfo(request);
    const ipAddress = getClientIP(request);
    await storeRefreshToken(user.id, newTokens.refreshToken, deviceInfo, ipAddress);

    // Actualizar sesión
    session.set("accessToken", newTokens.accessToken);
    session.set("refreshToken", newTokens.refreshToken);

    return { session, needsCommit: true };
}