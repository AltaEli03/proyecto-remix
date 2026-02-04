// app/routes/auth/login.server.ts
import { redirect } from "react-router";
import type { Route } from "../routes/auth/+types/login";
import {
  getUserByEmail,
  getUserById,
  verifyPassword,
  generateTokens,
  storeRefreshToken,
  verifyMFAToken,
  verifyBackupCode,
  isAccountLocked,
  incrementFailedAttempts,
  resetFailedAttempts
} from "~/utils/auth.server";
import { validateFormData, loginSchema, mfaCodeSchema } from "~/utils/validation.server";
import { getSession, commitSession } from "~/utils/sessions.server";
import { logSecurityEvent, getDeviceInfo, getClientIP } from "~/services/security.server";
import { sendLoginAlertEmail } from "~/services/email.server";
import { redirectIfAuthenticated } from "~/utils/auth.guard";

export async function loader({ request }: Route.LoaderArgs) {
  await redirectIfAuthenticated(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // =====================================
  // PASO 1: VALIDAR CREDENCIALES
  // =====================================
  if (intent === "login") {
    const validation = validateFormData(loginSchema, formData);

    if (!validation.success) {
      return { step: 'login', errors: validation.errors };
    }

    const { email, password } = validation.data;

    const user = await getUserByEmail(email);

    if (!user) {
      return {
        step: 'login',
        errors: { general: 'Email o contraseña incorrectos' }
      };
    }

    if (isAccountLocked(user)) {
      return {
        step: 'login',
        errors: {
          general: 'Cuenta bloqueada temporalmente. Intenta más tarde.'
        }
      };
    }

    const validPassword = await verifyPassword(password, user.password_hash);

    if (!validPassword) {
      const locked = await incrementFailedAttempts(user.id);
      await logSecurityEvent('login_failed', user.id, request);

      if (locked) {
        await logSecurityEvent('account_locked', user.id, request);
        return {
          step: 'login',
          errors: {
            general: 'Cuenta bloqueada por múltiples intentos fallidos'
          }
        };
      }

      return {
        step: 'login',
        errors: { general: 'Email o contraseña incorrectos' }
      };
    }

    if (!user.is_verified) {
      return {
        step: 'login',
        errors: {
          general: 'Por favor verifica tu email antes de iniciar sesión'
        }
      };
    }

    if (user.mfa_enabled) {
      session.set("auth_pending_user_id", user.id);
      return redirect("/auth/login?step=mfa", {
        headers: { "Set-Cookie": await commitSession(session) }
      });
    }

    return await completeLogin(user, session, request);
  }

  // =====================================
  // PASO 2: VALIDAR CÓDIGO MFA
  // =====================================
  if (intent === "mfa") {
    const userId = session.get("auth_pending_user_id");

    if (!userId) {
      return redirect("/auth/login");
    }

    const code = formData.get("code") as string;
    const isBackupCode = formData.get("useBackup") === "true";

    const user = await getUserById(userId);

    if (!user) {
      return redirect("/auth/login");
    }

    let isValid = false;

    if (isBackupCode) {
      isValid = await verifyBackupCode(user.id, code);
    } else {
      const validation = validateFormData(mfaCodeSchema, formData);
      if (!validation.success) {
        return { step: 'mfa', errors: validation.errors };
      }
      isValid = await verifyMFAToken(code, user.mfa_secret!);
    }

    if (!isValid) {
      return {
        step: 'mfa',
        errors: { code: 'Código inválido' }
      };
    }

    session.unset("auth_pending_user_id");
    return await completeLogin(user, session, request);
  }

  return { step: 'login', errors: { general: 'Acción no válida' } };
}

async function completeLogin(user: any, session: any, request: Request) {
  await resetFailedAttempts(user.id);

  const { accessToken, refreshToken } = generateTokens(user);

  const deviceInfo = getDeviceInfo(request);
  const ipAddress = getClientIP(request);
  await storeRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

  session.set("accessToken", accessToken);
  session.set("refreshToken", refreshToken);

  await logSecurityEvent('login_success', user.id, request);

  // Opcional: enviar alerta de login (puedes descomentar si lo necesitas)
  // try {
  //   await sendLoginAlertEmail(user.email, deviceInfo, ipAddress);
  // } catch (e) {
  //   console.error('Error enviando alerta de login:', e);
  // }

  return redirect("/", {
    headers: { "Set-Cookie": await commitSession(session) }
  });
}