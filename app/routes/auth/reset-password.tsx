// app/routes/auth/reset-password.tsx
import { Form, redirect, useLoaderData, useActionData, useNavigation, Link } from "react-router";
import { useState } from "react";
import {
    Lock,
    AlertCircle,
    CheckCircle,
    Eye,
    EyeOff,
    ShieldCheck,
    ArrowLeft
} from "lucide-react";
import type { Route } from "./+types/reset-password";
import { validatePasswordReset, completePasswordReset } from "~/utils/auth.server";
import { validateFormData, passwordResetSchema } from "~/utils/validation.server";
import { Alert } from "~/components/Alert";

// ✅ Definir tipos explícitos
type LoaderSuccess = {
    valid: true;
    token: string;
    error: null;
};

type LoaderError = {
    valid: false;
    token: null;
    error: string;
};

type LoaderData = LoaderSuccess | LoaderError;

export function meta() {
    return [
        { title: "Restablecer Contraseña | Mi App" },
        { name: "description", content: "Crea una nueva contraseña para tu cuenta" }
    ];
}

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
    // ✅ NO usar redirectIfAuthenticated aquí
    // El usuario debe poder cambiar su contraseña aunque tenga sesión

    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    // ✅ Validar que existe el token
    if (!token || token.trim() === '') {
        return {
            valid: false,
            token: null,
            error: 'No se proporcionó token de recuperación'
        };
    }

    try {
        // ✅ Validar el token en la base de datos
        const userId = await validatePasswordReset(token);

        if (!userId) {
            return {
                valid: false,
                token: null,
                error: 'El enlace es inválido o ha expirado. Por favor solicita uno nuevo.'
            };
        }

        return {
            valid: true,
            token,  // ✅ Retornar el token para usarlo en el action
            error: null
        };
    } catch (error) {
        console.error('Error validando token de reset:', error);
        return {
            valid: false,
            token: null,
            error: 'Error al validar el enlace. Por favor intenta de nuevo.'
        };
    }
}

export async function action({ request }: Route.ActionArgs) {
    const formData = await request.formData();
    const token = formData.get('token');

    // ✅ Validar token del formulario
    if (!token || typeof token !== 'string' || token.trim() === '') {
        return {
            success: false,
            errors: { general: 'Token no proporcionado. Por favor usa el enlace del email.' }
        };
    }

    // ✅ Primero validar que el token sigue siendo válido
    try {
        const userId = await validatePasswordReset(token);
        if (!userId) {
            return {
                success: false,
                errors: { general: 'El enlace ha expirado o ya fue usado. Por favor solicita uno nuevo.' }
            };
        }
    } catch (error) {
        console.error('Error validando token en action:', error);
        return {
            success: false,
            errors: { general: 'Error al validar el enlace.' }
        };
    }

    // ✅ Validar el formulario
    const validation = validateFormData(passwordResetSchema, formData);

    if (!validation.success) {
        return { success: false, errors: validation.errors };
    }

    const { password } = validation.data;

    // ✅ Completar el reset
    try {
        const success = await completePasswordReset(token, password);

        if (!success) {
            return {
                success: false,
                errors: { general: 'No se pudo cambiar la contraseña. El enlace puede haber expirado.' }
            };
        }

        // ✅ Redirigir al login con mensaje de éxito
        return redirect('/auth/login?reset=success');
    } catch (error) {
        console.error('Error completando reset de contraseña:', error);
        return {
            success: false,
            errors: { general: 'Error al cambiar la contraseña. Por favor intenta de nuevo.' }
        };
    }
}

const passwordRequirements = [
    { label: "Al menos 8 caracteres", test: (p: string) => p.length >= 8 },
    { label: "Una letra mayúscula", test: (p: string) => /[A-Z]/.test(p) },
    { label: "Una letra minúscula", test: (p: string) => /[a-z]/.test(p) },
    { label: "Un número", test: (p: string) => /[0-9]/.test(p) },
    { label: "Un carácter especial", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function ResetPassword() {
    // ✅ Tipado explícito
    const loaderData = useLoaderData<typeof loader>() as LoaderData;
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ✅ Si el token es inválido, mostrar error
    if (!loaderData.valid) {
        return (
            <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
                <div className="card w-full max-w-md bg-base-100 shadow-xl">
                    <div className="card-body text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-error" />
                            </div>
                        </div>

                        <h1 className="card-title justify-center text-xl text-error">
                            Enlace Inválido
                        </h1>

                        <p className="text-base-content/70 mt-2">
                            {loaderData.error}
                        </p>

                        <div className="mt-6 space-y-2">
                            <Link to="/auth/forgot-password" className="btn btn-primary w-full">
                                Solicitar Nuevo Enlace
                            </Link>
                            <Link to="/auth/login" className="btn btn-ghost w-full">
                                Volver al Login
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // ✅ A partir de aquí, loaderData.valid es true y token existe
    const { token } = loaderData;

    const passwordStrength = passwordRequirements.filter(req => req.test(password)).length;
    const passwordStrengthPercentage = (passwordStrength / passwordRequirements.length) * 100;
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
    const isFormValid = passwordStrengthPercentage >= 100 && passwordsMatch;

    const getPasswordStrengthColor = () => {
        if (passwordStrengthPercentage >= 100) return "progress-success";
        if (passwordStrengthPercentage >= 60) return "progress-warning";
        return "progress-error";
    };

    return (
        <main className="min-h-screen bg-base-200 p-4">
            <div className="container mx-auto max-w-md">
                <section className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="avatar placeholder">
                                <div className="bg-primary text-primary-content rounded-full w-12 h-12 flex items-center justify-center">
                                    <Lock className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <h1 className="card-title text-2xl">
                                    Nueva Contraseña
                                </h1>
                                <p className="text-base-content/60 text-sm">
                                    Crea una contraseña segura
                                </p>
                            </div>
                        </div>

                        {/* Errores usando Alert */}
                        <Alert
                            type="error"
                            message={actionData?.errors?.general || null}
                            dismissible
                            className="mb-4"
                        />

                        <Form method="post" noValidate className="space-y-4">
                            {/* ✅ Token como campo hidden - ahora garantizado que existe */}
                            <input type="hidden" name="token" value={token} />

                            {/* Nueva Contraseña */}
                            <div className="form-control">
                                <label className="label" htmlFor="password">
                                    <span className="label-text font-medium flex items-center gap-2">
                                        <Lock className="w-4 h-4" />
                                        Nueva Contraseña
                                        <span className="text-error">*</span>
                                    </span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`input input-bordered w-full pr-12 ${actionData?.errors?.password ? 'input-error' : ''}`}
                                        placeholder="Mínimo 8 caracteres"
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {actionData?.errors?.password && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">
                                            {actionData.errors.password}
                                        </span>
                                    </label>
                                )}

                                {password && (
                                    <progress
                                        className={`progress w-full h-2 mt-2 ${getPasswordStrengthColor()}`}
                                        value={passwordStrengthPercentage}
                                        max="100"
                                    />
                                )}

                                <div className="bg-base-200 rounded-lg p-3 mt-2">
                                    <ul className="grid grid-cols-1 gap-1">
                                        {passwordRequirements.map((req, index) => {
                                            const isMet = req.test(password);
                                            return (
                                                <li
                                                    key={index}
                                                    className={`text-xs flex items-center gap-2 ${isMet ? 'text-success' : 'text-base-content/50'}`}
                                                >
                                                    {isMet ? (
                                                        <CheckCircle className="w-3 h-3" />
                                                    ) : (
                                                        <div className="w-3 h-3 rounded-full border border-current" />
                                                    )}
                                                    <span>{req.label}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>

                            {/* Confirmar Contraseña */}
                            <div className="form-control">
                                <label className="label" htmlFor="confirmPassword">
                                    <span className="label-text font-medium flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        Confirmar Contraseña
                                        <span className="text-error">*</span>
                                    </span>
                                    {confirmPassword && (
                                        <span className={`label-text-alt font-medium flex items-center gap-1 ${passwordsMatch ? 'text-success' : 'text-error'}`}>
                                            {passwordsMatch ? (
                                                <><CheckCircle className="w-3 h-3" /> Coinciden</>
                                            ) : (
                                                <><AlertCircle className="w-3 h-3" /> No coinciden</>
                                            )}
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`input input-bordered w-full pr-12 ${confirmPassword && !passwordsMatch ? 'input-error' :
                                            confirmPassword && passwordsMatch ? 'input-success' : ''
                                            }`}
                                        placeholder="Repite tu contraseña"
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {actionData?.errors?.confirmPassword && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">
                                            {actionData.errors.confirmPassword}
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Botón */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !isFormValid}
                                className="btn btn-primary w-full gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner w-4 h-4" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4" />
                                        Cambiar Contraseña
                                    </>
                                )}
                            </button>
                        </Form>

                        <Link to="/auth/login" className="btn btn-ghost w-full gap-2 mt-2">
                            <ArrowLeft className="w-4 h-4" />
                            Volver al Login
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}