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
    resetFailedAttempts,
    type User
} from "~/utils/auth.server";
import {
    validateFormData,
    loginSchema,
    mfaCodeSchema
} from "~/utils/validation.server";
import {
    getSession,
    commitSession,
    type AppSession
} from "~/utils/sessions.server";
import { getCSRFToken } from "~/utils/csrf.server";
import {
    logSecurityEvent,
    getDeviceInfo,
    getClientIP,
    detectSuspiciousActivity
} from "~/services/security.server";
import { sendLoginAlertEmail, sendSuspiciousActivityEmail } from "~/services/email.server";
import { redirectIfAuthenticated } from "~/utils/auth.guard";
import { checkRateLimit, resetRateLimit } from "~/services/rate-limit.server";
import { RateLimitError } from "~/utils/errors.server";

// =====================
// LOADER
// =====================

export async function loader({ request }: Route.LoaderArgs) {
    await redirectIfAuthenticated(request);

    const { token, session, needsCommit } = await getCSRFToken(request);

    const data = { csrfToken: token };

    if (needsCommit) {
        return Response.json(data, {
            headers: { "Set-Cookie": await commitSession(session) }
        });
    }

    return data;
}

// =====================
// ACTION
// =====================

export async function action({ request }: Route.ActionArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    // =====================================
    // PASO 1: VALIDAR CREDENCIALES
    // =====================================
    if (intent === "login") {
        const ipAddress = getClientIP(request);

        // Rate limiting por IP
        try {
            await checkRateLimit('login', ipAddress);
        } catch (error) {
            if (error instanceof RateLimitError) {
                const minutes = Math.ceil(error.retryAfter / 60);
                return {
                    step: 'login' as const,
                    errors: {
                        general: `Demasiados intentos. Intenta en ${minutes} minuto${minutes > 1 ? 's' : ''}.`
                    }
                };
            }
            throw error;
        }

        const validation = validateFormData(loginSchema, formData);

        if (!validation.success) {
            return { step: 'login' as const, errors: validation.errors };
        }

        const { email, password } = validation.data;
        const user = await getUserByEmail(email);

        if (!user) {
            return {
                step: 'login' as const,
                errors: { general: 'Email o contraseña incorrectos' }
            };
        }

        // Verificar bloqueo
        if (isAccountLocked(user)) {
            return {
                step: 'login' as const,
                errors: {
                    general: 'Cuenta bloqueada temporalmente. Intenta más tarde.'
                }
            };
        }

        // Verificar contraseña
        const validPassword = await verifyPassword(
            password,
            user.password_hash
        );

        if (!validPassword) {
            const locked = await incrementFailedAttempts(user.id);
            await logSecurityEvent('login_failed', user.id, request);

            if (locked) {
                await logSecurityEvent('account_locked', user.id, request);
                return {
                    step: 'login' as const,
                    errors: {
                        general: 'Cuenta bloqueada por múltiples intentos fallidos'
                    }
                };
            }

            return {
                step: 'login' as const,
                errors: { general: 'Email o contraseña incorrectos' }
            };
        }

        // Verificar email
        if (!user.is_verified) {
            return {
                step: 'login' as const,
                errors: {
                    general: 'Por favor verifica tu email antes de iniciar sesión'
                }
            };
        }

        // MFA requerido
        if (user.mfa_enabled) {
            session.set("auth_pending_user_id", user.id);

            // Rate limit específico para MFA
            try {
                await checkRateLimit('mfa', `${user.id}`);
            } catch (error) {
                if (error instanceof RateLimitError) {
                    return {
                        step: 'login' as const,
                        errors: {
                            general: 'Demasiados intentos de MFA. Intenta más tarde.'
                        }
                    };
                }
            }

            return redirect("/auth/login?step=mfa", {
                headers: {
                    "Set-Cookie": await commitSession(session)
                }
            });
        }

        // Login directo (sin MFA)
        return await completeLogin(user, session, request, ipAddress);
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

        // Rate limit para MFA
        try {
            await checkRateLimit('mfa', `${user.id}`);
        } catch (error) {
            if (error instanceof RateLimitError) {
                return {
                    step: 'mfa' as const,
                    errors: {
                        code: 'Demasiados intentos. Intenta más tarde.'
                    }
                };
            }
            throw error;
        }

        let isValid = false;

        if (isBackupCode) {
            isValid = await verifyBackupCode(user.id, code);
            if (isValid) {
                await logSecurityEvent(
                    'mfa_backup_used',
                    user.id,
                    request
                );
            }
        } else {
            const validation = validateFormData(mfaCodeSchema, formData);
            if (!validation.success) {
                return {
                    step: 'mfa' as const,
                    errors: validation.errors
                };
            }
            isValid = await verifyMFAToken(code, user.mfa_secret!);
        }

        if (!isValid) {
            await logSecurityEvent('login_failed', user.id, request, {
                reason: 'invalid_mfa_code',
                isBackupCode
            });

            return {
                step: 'mfa' as const,
                errors: { code: 'Código inválido' }
            };
        }

        session.unset("auth_pending_user_id");

        // Reset rate limit de MFA tras éxito
        await resetRateLimit('mfa', `${user.id}`);

        const ipAddress = getClientIP(request);
        return await completeLogin(user, session, request, ipAddress);
    }

    return {
        step: 'login' as const,
        errors: { general: 'Acción no válida' }
    };
}

// =====================
// COMPLETE LOGIN
// =====================

async function completeLogin(
    user: User,
    session: AppSession,
    request: Request,
    ipAddress: string
) {
    await resetFailedAttempts(user.id);

    // Reset rate limit tras login exitoso
    await resetRateLimit('login', ipAddress);

    const deviceInfo = getDeviceInfo(request);
    const { accessToken, refreshToken, refreshFamily } = generateTokens(
        user,
        { mfaVerified: true }
    );

    await storeRefreshToken(user.id, refreshToken, {
        deviceInfo,
        ipAddress,
        family: refreshFamily
    });

    session.set("accessToken", accessToken);
    session.set("refreshToken", refreshToken);

    await logSecurityEvent('login_success', user.id, request);

    // Detectar actividad sospechosa (async, no bloquea)
    detectSuspiciousActivity(user.id, request)
        .then(async ({ suspicious, reasons }) => {
            if (suspicious) {
                try {
                    await sendSuspiciousActivityEmail(
                        user.email,
                        reasons,
                        ipAddress
                    );
                } catch (e) {
                    console.error(
                        'Error enviando alerta de actividad sospechosa:',
                        e
                    );
                }
            }
        })
        .catch(e => {
            console.error('Error detectando actividad sospechosa:', e);
        });

    // Enviar alerta de login desde nueva IP (opcional)
    // Lo hacemos async para no bloquear
    sendLoginAlertEmail(user.email, deviceInfo, ipAddress)
        .catch(e => {
            console.error('Error enviando alerta de login:', e);
        });

    return redirect("/", {
        headers: { "Set-Cookie": await commitSession(session) }
    });
}