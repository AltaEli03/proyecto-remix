// app/routes/auth/mfa/disable.tsx
import { Form, redirect, useActionData, useNavigation, Link } from "react-router";
import { useState } from "react";
import { ShieldOff, AlertTriangle, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import type { Route } from "./+types/disable";
import { requireAuth } from "~/utils/auth.guard";
import { verifyPassword } from "~/utils/auth.server";
import { execute, queryOne } from "~/utils/db.server";
import { logSecurityEvent } from "~/services/security.server";
import { Alert } from "~/components/Alert";

export function meta() {
    return [
        { title: "Desactivar 2FA | Mi App" },
        { name: "description", content: "Desactiva la autenticación de dos factores" }
    ];
}

export async function loader({ request }: Route.LoaderArgs) {
    const { user } = await requireAuth(request);

    if (!user.mfaEnabled) {
        throw redirect("/settings");
    }

    return { user };
}

export async function action({ request }: Route.ActionArgs) {
    const { user } = await requireAuth(request);
    const formData = await request.formData();

    const password = formData.get("password") as string;

    if (!password) {
        return { error: "La contraseña es requerida" };
    }

    const dbUser = await queryOne<{
        password_hash: string;
    }>(
        "SELECT password_hash FROM users WHERE id = ?",
        [user.id]
    );

    if (!dbUser) {
        return { error: "Usuario no encontrado" };
    }

    const validPassword = await verifyPassword(password, dbUser.password_hash);
    if (!validPassword) {
        await logSecurityEvent('login_failed', user.id, request, {
            context: 'mfa_disable_attempt'
        });
        return { error: "Contraseña incorrecta" };
    }

    await execute(
        "UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = ?",
        [user.id]
    );

    await execute("DELETE FROM mfa_backup_codes WHERE user_id = ?", [user.id]);

    await logSecurityEvent('mfa_disabled', user.id, request);

    return redirect("/settings?mfa=disabled");
}

export default function DisableMFA() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';

    const [confirmed, setConfirmed] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="avatar placeholder">
                            <div className="bg-error text-error-content rounded-full w-12 h-12 flex items-center justify-center">
                                <ShieldOff className="w-6 h-6" />
                            </div>
                        </div>
                        <div>
                            <h1 className="card-title text-xl">
                                Desactivar 2FA
                            </h1>
                            <p className="text-base-content/60 text-sm">
                                Esto reducirá la seguridad de tu cuenta
                            </p>
                        </div>
                    </div>

                    {/* Advertencia usando Alert */}
                    <Alert
                        type="warning"
                        message="Al desactivar 2FA, tu cuenta será más vulnerable a accesos no autorizados."
                        dismissible={false}
                        className="mb-4"
                    />

                    {/* Error usando Alert */}
                    <Alert
                        type="error"
                        message={actionData?.error || null}
                        dismissible
                        className="mb-4"
                    />

                    {!confirmed ? (
                        <div className="mt-2 space-y-4">
                            <div className="bg-base-200 rounded-lg p-4">
                                <h3 className="font-medium mb-2">¿Qué sucederá?</h3>
                                <ul className="text-sm text-base-content/70 space-y-1">
                                    <li>• Se desactivará la verificación en dos pasos</li>
                                    <li>• Tus códigos de respaldo serán eliminados</li>
                                    <li>• Solo necesitarás tu contraseña para iniciar sesión</li>
                                </ul>
                            </div>

                            <button
                                onClick={() => setConfirmed(true)}
                                className="btn btn-error w-full"
                            >
                                Entiendo los riesgos, continuar
                            </button>

                            <Link to="/settings" className="btn btn-ghost w-full">
                                Cancelar
                            </Link>
                        </div>
                    ) : (
                        <Form method="post" className="mt-2 space-y-4">
                            <p className="text-sm text-base-content/70">
                                Ingresa tu contraseña para confirmar la desactivación de 2FA.
                            </p>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text flex items-center gap-2">
                                        <Lock className="w-4 h-4" />
                                        Contraseña
                                    </span>
                                </label>
                                <div className="relative">
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        className="input input-bordered w-full pr-12"
                                        placeholder="Tu contraseña actual"
                                        required
                                        autoComplete="current-password"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn-error w-full gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm" />
                                        Desactivando...
                                    </>
                                ) : (
                                    <>
                                        <ShieldOff className="w-4 h-4" />
                                        Desactivar 2FA
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setConfirmed(false)}
                                className="btn btn-ghost w-full gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Volver
                            </button>
                        </Form>
                    )}
                </div>
            </div>
        </main>
    );
}