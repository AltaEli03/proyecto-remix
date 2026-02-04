import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { getSession, destroySession } from "~/utils/sessions.server";
import { revokeRefreshToken, verifyAccessToken } from "~/utils/auth.server";
import { logSecurityEvent } from "~/services/security.server";

export async function loader({ request }: Route.LoaderArgs) {
  return handleLogout(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleLogout(request);
}

async function handleLogout(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  const accessToken = session.get("accessToken");
  const refreshToken = session.get("refreshToken");

  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) {
      // Log de seguridad
      await logSecurityEvent('logout', payload.id, request);
    }
  }

  // Revocar refresh token
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  // Destruir sesión y redirigir
  return redirect("/auth/login?loggedout=true", {
    headers: {
      "Set-Cookie": await destroySession(session)
    }
  });
}