// app/routes/auth/login.tsx
import { Form, useActionData, useNavigation, Link, useSearchParams } from "react-router";
import { useState } from "react";
import {
  LogIn,
  Mail,
  Lock,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";
import { Alert } from "~/components/Alert";

export { loader, action } from "../../utils/login.server";

// Tipos para el action data
type ActionData = {
  step?: 'login' | 'mfa';
  errors?: {
    email?: string;
    password?: string;
    code?: string;
    general?: string;
  };
};

export function meta() {
  return [
    { title: "Iniciar Sesión | Mi App" },
    { name: "description", content: "Inicia sesión en tu cuenta" }
  ];
}

export default function Login() {
  // ✅ Usar el tipo explícito
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === 'submitting';

  const [showPassword, setShowPassword] = useState(false);

  const step = searchParams.get('step') || 'login';
  const registered = searchParams.get('registered') === 'true';
  const expired = searchParams.get('expired') === 'true';
  const reset = searchParams.get('reset') === 'success';
  const loggedout = searchParams.get('loggedout');

  const hasErrors = actionData?.errors && Object.values(actionData.errors).some((error) => error);

  return (
    <main className="min-h-screen bg-base-200 p-4">
      <div className="container mx-auto max-w-md">
        <section
          aria-labelledby="login-title"
          className="card bg-base-100 shadow-xl"
        >
          <div className="card-body">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-12 h-12 flex items-center justify-center">
                  {step === 'mfa' ? (
                    <ShieldCheck className="w-6 h-6" aria-hidden="true" />
                  ) : (
                    <LogIn className="w-6 h-6" aria-hidden="true" />
                  )}
                </div>
              </div>
              <div>
                <h1 id="login-title" className="card-title text-2xl">
                  {step === 'mfa' ? 'Verificación de Dos Factores' : 'Iniciar Sesión'}
                </h1>
                <p className="text-base-content/60 text-sm">
                  {step === 'mfa'
                    ? 'Ingresa el código de tu app de autenticación'
                    : 'Accede a tu cuenta de forma segura'
                  }
                </p>
              </div>
            </div>

            {/* Mensajes de estado usando Alert */}
            <Alert
              type="success"
              message={registered ? "¡Cuenta creada! Revisa tu email para verificarla." : null}
              dismissible
              autoClose={5000}
              className="mb-4"
            />

            <Alert
              type="success"
              message={reset ? "¡Contraseña actualizada! Ya puedes iniciar sesión." : null}
              dismissible
              autoClose={5000}
              className="mb-4"
            />

            <Alert
              type="info"
              message={loggedout === 'all' ? "Todas las sesiones han sido cerradas." : null}
              dismissible
              autoClose={5000}
              className="mb-4"
            />

            <Alert
              type="warning"
              message={expired ? "Tu sesión expiró. Por favor inicia sesión nuevamente." : null}
              dismissible
              className="mb-4"
            />

            <Alert
              type="error"
              message={hasErrors ? (actionData?.errors?.general || 'Por favor, completa los campos marcados.') : null}
              dismissible
              className="mb-4"
            />

            {/* Formulario de Login */}
            {step === 'login' && (
              <Form method="post" noValidate className="space-y-4">
                <input type="hidden" name="intent" value="login" />

                {/* Email */}
                <div className="form-control">
                  <label className="label" htmlFor="email">
                    <span className="label-text font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" aria-hidden="true" />
                      Correo electrónico
                      <span className="text-error" aria-hidden="true">*</span>
                    </span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`input input-bordered w-full ${actionData?.errors?.email ? 'input-error' : ''}`}
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={!!actionData?.errors?.email}
                  />
                  {actionData?.errors?.email ? (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {actionData.errors.email}
                      </span>
                    </label>
                  ) : (
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        Ingresa el email asociado a tu cuenta
                      </span>
                    </label>
                  )}
                </div>

                {/* Contraseña */}
                <div className="form-control">
                  <label className="label" htmlFor="password">
                    <span className="label-text font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                      Contraseña
                      <span className="text-error" aria-hidden="true">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      className={`input input-bordered w-full pr-12 ${actionData?.errors?.password ? 'input-error' : ''}`}
                      placeholder="Tu contraseña"
                      required
                      autoComplete="current-password"
                      aria-required="true"
                      aria-invalid={!!actionData?.errors?.password}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {actionData?.errors?.password ? (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {actionData.errors.password}
                      </span>
                    </label>
                  ) : (
                    <label className="label">
                      <Link
                        to="/auth/forgot-password"
                        className="label-text-alt link link-hover text-primary"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </label>
                  )}
                </div>

                {/* Botón de Login */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary w-full gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner w-4 h-4" aria-hidden="true" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" aria-hidden="true" />
                      Iniciar Sesión
                    </>
                  )}
                </button>
              </Form>
            )}

            {/* Formulario de MFA */}
            {step === 'mfa' && (
              <div className="space-y-4">
                <div className="bg-base-200 rounded-lg p-4 text-center">
                  <ShieldCheck className="w-12 h-12 mx-auto text-primary mb-2" aria-hidden="true" />
                  <p className="text-sm text-base-content/70">
                    Ingresa el código de 6 dígitos de tu aplicación de autenticación
                  </p>
                </div>

                <Alert
                  type="error"
                  message={actionData?.errors?.code}
                  dismissible
                  className="mb-2"
                />

                <Form method="post" noValidate className="space-y-4">
                  <input type="hidden" name="intent" value="mfa" />

                  <div className="form-control">
                    <label className="label" htmlFor="code">
                      <span className="label-text font-medium flex items-center gap-2">
                        <KeyRound className="w-4 h-4" aria-hidden="true" />
                        Código de verificación
                        <span className="text-error" aria-hidden="true">*</span>
                      </span>
                    </label>
                    <input
                      id="code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className={`input input-bordered w-full text-center text-2xl tracking-widest font-mono ${actionData?.errors?.code ? 'input-error' : ''}`}
                      placeholder="000000"
                      required
                      autoComplete="one-time-code"
                      autoFocus
                      aria-required="true"
                      aria-invalid={!!actionData?.errors?.code}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        El código cambia cada 30 segundos
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary w-full gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner w-4 h-4" aria-hidden="true" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        Verificar Código
                      </>
                    )}
                  </button>
                </Form>

                <div className="divider text-xs text-base-content/50">
                  ¿Problemas con el código?
                </div>

                {/* Código de respaldo */}
                <details className="collapse collapse-arrow bg-base-200 rounded-lg">
                  <summary className="collapse-title text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                      Usar código de respaldo
                    </span>
                  </summary>
                  <div className="collapse-content">
                    <Form method="post" noValidate className="space-y-3 pt-2">
                      <input type="hidden" name="intent" value="mfa" />
                      <input type="hidden" name="useBackup" value="true" />
                      <input
                        name="code"
                        type="text"
                        className="input input-bordered input-sm w-full font-mono"
                        placeholder="XXXX-XXXX"
                        required
                        aria-label="Código de respaldo"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-outline btn-sm w-full"
                      >
                        Usar código de respaldo
                      </button>
                    </Form>
                  </div>
                </details>

                <Link to="/auth/login" className="btn btn-ghost w-full gap-2">
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Volver al login
                </Link>
              </div>
            )}

            {step === 'login' && (
              <>
                <div className="divider text-base-content/50">¿No tienes cuenta?</div>
                <Link to="/auth/register" className="btn btn btn-outline btn-secondary w-full">
                  Crear una cuenta
                </Link>
              </>
            )}

            <div className="divider"></div>
            <Link to="/" className="btn btn-ghost">
              ← Volver al Inicio
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}