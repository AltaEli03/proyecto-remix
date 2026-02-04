// app/routes/auth/forgot-password.tsx
import { Form, useActionData, useNavigation, Link } from "react-router";
import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle, Send } from "lucide-react";
import type { Route } from "./+types/forgot-password";
import { getUserByEmail, createPasswordReset } from "~/utils/auth.server";
import { sendPasswordResetEmail } from "~/services/email.server";
import { redirectIfAuthenticated } from "~/utils/auth.guard";
import { z } from "zod";
import { Alert } from "~/components/Alert";

const forgotPasswordSchema = z.object({
    email: z
        .string()
        .email('Email inválido')
        .transform(v => v.toLowerCase().trim())
});

export function meta() {
    return [
        { title: "Recuperar Contraseña | Mi App" },
        { name: "description", content: "Recupera el acceso a tu cuenta" }
    ];
}

export async function loader({ request }: Route.LoaderArgs) {
    await redirectIfAuthenticated(request);
    return null;
}

export async function action({ request }: Route.ActionArgs) {
    const formData = await request.formData();
    const email = formData.get("email") as string;

    const validation = forgotPasswordSchema.safeParse({ email });

    if (!validation.success) {
        return {
            success: false,
            errors: { email: validation.error.issues[0].message }
        };
    }

    const normalizedEmail = validation.data.email;

    const user = await getUserByEmail(normalizedEmail);

    if (user) {
        try {
            const token = await createPasswordReset(user.id);
            await sendPasswordResetEmail(normalizedEmail, token);
        } catch (error) {
            console.error('Error enviando email de reset:', error);
        }
    }

    return {
        success: true,
        message: 'Si existe una cuenta con ese email, recibirás instrucciones para restablecer tu contraseña.'
    };
}

export default function ForgotPassword() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';
    const [email, setEmail] = useState('');

    if (actionData?.success) {
        return (
            <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
                <div className="card w-full max-w-md bg-base-100 shadow-xl">
                    <div className="card-body text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-success" />
                            </div>
                        </div>

                        <h1 className="card-title justify-center text-xl">
                            ¡Revisa tu correo!
                        </h1>

                        <p className="text-base-content/70 mt-2">
                            {actionData.message}
                        </p>

                        <div className="bg-base-200 rounded-lg p-4 mt-4">
                            <p className="text-sm text-base-content/60">
                                El enlace expirará en <strong>1 hora</strong>.
                                <br />
                                Si no ves el correo, revisa tu carpeta de spam.
                            </p>
                        </div>

                        <div className="mt-6 space-y-2">
                            <Link to="/auth/login" className="btn btn-primary w-full">
                                Volver al Login
                            </Link>

                            <button
                                onClick={() => window.location.reload()}
                                className="btn btn-ghost btn-sm w-full"
                            >
                                Enviar de nuevo
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-base-200 p-4">
            <div className="container mx-auto max-w-md">
                <section className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="avatar placeholder">
                                <div className="bg-warning text-warning-content rounded-full w-12 h-12 flex items-center justify-center">
                                    <Mail className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <h1 className="card-title text-2xl">
                                    Recuperar Contraseña
                                </h1>
                                <p className="text-base-content/60 text-sm">
                                    Te enviaremos un enlace para restablecerla
                                </p>
                            </div>
                        </div>

                        {/* Errores usando Alert */}
                        <Alert
                            type="error"
                            message={actionData?.errors?.email || null}
                            dismissible
                            className="mb-4"
                        />

                        <Form method="post" noValidate className="space-y-4">
                            {/* Email */}
                            <div className="form-control">
                                <label className="label" htmlFor="email">
                                    <span className="label-text font-medium flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        Correo electrónico
                                        <span className="text-error">*</span>
                                    </span>
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`input input-bordered w-full ${actionData?.errors?.email ? 'input-error' : ''}`}
                                    placeholder="tu@email.com"
                                    required
                                    autoComplete="email"
                                    autoFocus
                                />
                                <label className="label">
                                    <span className="label-text-alt text-base-content/50">
                                        Ingresa el email asociado a tu cuenta
                                    </span>
                                </label>
                            </div>

                            {/* Botón de envío */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !email}
                                className="btn btn-primary w-full gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner w-4 h-4" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar Instrucciones
                                    </>
                                )}
                            </button>
                        </Form>

                        <div className="divider text-base-content/50">o</div>

                        <Link to="/auth/login" className="btn btn-outline w-full gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Volver al Login
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}