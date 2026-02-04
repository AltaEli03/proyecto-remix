import { redirect, useLoaderData, Link } from "react-router";
import type { Route } from "./+types/verify-email";
import { validateEmailVerification, verifyUserEmail } from "~/utils/auth.server";
import { logSecurityEvent } from "~/services/security.server";

export async function loader({ request }: Route.LoaderArgs) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const pending = url.searchParams.get('pending');

    // Si no hay token, mostrar página de pendiente
    if (!token) {
        return {
            status: pending ? 'pending' : 'error',
            message: pending
                ? 'Por favor verifica tu email antes de continuar'
                : 'Token de verificación no proporcionado'
        };
    }

    // Validar token
    const userId = await validateEmailVerification(token);

    if (!userId) {
        return {
            status: 'error',
            message: 'El enlace de verificación es inválido o ha expirado'
        };
    }

    // Verificar usuario
    await verifyUserEmail(userId);
    await logSecurityEvent('email_verified', userId, request);

    return {
        status: 'success',
        message: '¡Email verificado correctamente! Ya puedes iniciar sesión.'
    };
}

export default function VerifyEmail() {
    const { status, message } = useLoaderData<typeof loader>();

    return (
        <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body text-center">
                    {status === 'success' && (
                        <>
                            <div className="text-6xl mb-4">✅</div>
                            <h1 className="card-title justify-center text-success">
                                ¡Verificación Exitosa!
                            </h1>
                        </>
                    )}

                    {status === 'pending' && (
                        <>
                            <div className="text-6xl mb-4">📧</div>
                            <h1 className="card-title justify-center">
                                Verifica tu Email
                            </h1>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="text-6xl mb-4">❌</div>
                            <h1 className="card-title justify-center text-error">
                                Error de Verificación
                            </h1>
                        </>
                    )}

                    <p className="py-4">{message}</p>

                    <Link to="/auth/login" className="btn btn-primary">
                        Ir a Iniciar Sesión
                    </Link>
                </div>
            </div>
        </main>
    );
}