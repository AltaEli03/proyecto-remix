// app/routes/auth/register.server.ts

import { redirect } from "react-router";
import type { Route } from "../routes/auth/+types/register";
import { registerUserAtomic } from "~/utils/auth.server";
import {
  validateFormData,
  registerSchema
} from "~/utils/validation.server";
import { sendVerificationEmail } from "~/services/email.server";
import { redirectIfAuthenticated } from "~/utils/auth.guard";
import { getCSRFToken } from "~/utils/csrf.server";
import { commitSession } from "~/utils/sessions.server";
import { checkRateLimit } from "~/services/rate-limit.server";
import { getClientIP } from "~/services/security.server";
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
  const formData = await request.formData();
  const ipAddress = getClientIP(request);

  // Rate limiting por IP
  try {
    await checkRateLimit('register', ipAddress);
  } catch (error) {
    if (error instanceof RateLimitError) {
      const minutes = Math.ceil(error.retryAfter / 60);
      return {
        errors: {
          general: `Demasiados intentos de registro. Intenta en ${minutes} minuto${minutes > 1 ? 's' : ''}.`
        }
      };
    }
    throw error;
  }

  // Validación del formulario
  const validation = validateFormData(registerSchema, formData);

  if (!validation.success) {
    return { errors: validation.errors };
  }

  const { email, password, name } = validation.data;

  try {
    // Registro atómico en transacción
    const { userId, verificationToken } = await registerUserAtomic(
      email,
      password,
      name,
      request
    );

    // Envío de email DESPUÉS de que la transacción fue exitosa
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error(
        'Error enviando email de verificación:',
        emailError
      );
      return redirect(
        '/auth/login?registered=true&emailPending=true'
      );
    }

    return redirect('/auth/login?registered=true');

  } catch (error) {
    console.error('Error en registro:', error);

    if (
      error instanceof Error &&
      error.message === 'EMAIL_EXISTS'
    ) {
      return {
        errors: {
          email: 'Ya existe una cuenta con este email'
        }
      };
    }

    return {
      errors: {
        general: 'Ocurrió un error al crear tu cuenta. Inténtalo de nuevo.'
      }
    };
  }
}