// app/routes/auth/register.tsx
import { Form, useActionData, useNavigation, Link } from "react-router";
import { useState } from "react";
import {
  UserPlus,
  User,
  Mail,
  Lock,
  CheckCircle,
  Eye,
  EyeOff,
  Info,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { Alert } from "~/components/Alert";
export { loader, action } from "../../utils/register.server";

// Tipos para el action data
type ActionData = {
  errors?: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  };
};

const FIELD_LIMITS = {
  name: { min: 2, max: 50 },
  email: { min: 5, max: 100 },
  password: { min: 8, max: 128 },
} as const;

export function meta() {
  return [
    { title: "Registro | Mi App" },
    { name: "description", content: "Crea tu cuenta en Mi App" }
  ];
}

const getCharacterProgress = (current: number, max: number) => {
  const percentage = (current / max) * 100;
  if (percentage >= 90) return "text-error";
  if (percentage >= 70) return "text-warning";
  return "text-base-content/50";
};

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "Al menos 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Una letra mayúscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Una letra minúscula", test: (p) => /[a-z]/.test(p) },
  { label: "Un número", test: (p) => /[0-9]/.test(p) },
  { label: "Un carácter especial (!@#$%^&*)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function Register() {
  // ✅ Usar el tipo explícito en lugar de typeof action
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasErrors = actionData?.errors && Object.values(actionData.errors).some((error) => error);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const passwordStrength = passwordRequirements.filter(req => req.test(formData.password)).length;
  const passwordStrengthPercentage = (passwordStrength / passwordRequirements.length) * 100;

  const passwordsMatch = formData.password === formData.confirmPassword;
  const showPasswordMatchStatus = formData.confirmPassword.length > 0;

  const getPasswordStrengthColor = () => {
    if (passwordStrengthPercentage >= 100) return "progress-success";
    if (passwordStrengthPercentage >= 60) return "progress-warning";
    return "progress-error";
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrengthPercentage >= 100) return "Fuerte";
    if (passwordStrengthPercentage >= 60) return "Media";
    if (passwordStrengthPercentage >= 40) return "Débil";
    return "Muy débil";
  };

  const isFormValid = passwordStrengthPercentage >= 100 && passwordsMatch && formData.confirmPassword.length > 0;

  return (
    <main className="min-h-screen bg-base-200 p-4">
      <div className="container mx-auto max-w-md">
        <section
          aria-labelledby="register-title"
          className="card bg-base-100 shadow-xl"
        >
          <div className="card-body">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar placeholder">
                <div className="bg-secondary text-secondary-content rounded-full w-12 h-12 flex items-center justify-center">
                  <UserPlus className="w-6 h-6" aria-hidden="true" />
                </div>
              </div>
              <div>
                <h1 id="register-title" className="card-title text-2xl">
                  Crear Cuenta
                </h1>
                <p className="text-base-content/60 text-sm">
                  Todos los campos son obligatorios
                </p>
              </div>
            </div>

            {/* Error Summary usando Alert */}
            <Alert
              type="error"
              message={hasErrors ? (actionData?.errors?.general || 'Por favor, completa los campos marcados.') : null}
              dismissible
              className="mb-4"
            />

            <Form method="post" noValidate className="space-y-4">
              {/* Nombre */}
              <div className="form-control">
                <label className="label" htmlFor="name">
                  <span className="label-text font-medium flex items-center gap-2">
                    <User className="w-4 h-4" aria-hidden="true" />
                    Nombre completo
                    <span className="text-error" aria-hidden="true">*</span>
                  </span>
                  <span className={`label-text-alt ${getCharacterProgress(formData.name.length, FIELD_LIMITS.name.max)}`}>
                    {formData.name.length}/{FIELD_LIMITS.name.max}
                  </span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={FIELD_LIMITS.name.max}
                  className={`input input-bordered w-full ${actionData?.errors?.name ? 'input-error' : ''}`}
                  placeholder="Juan Pérez"
                  required
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={!!actionData?.errors?.name}
                />
                {actionData?.errors?.name ? (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {actionData.errors.name}
                    </span>
                  </label>
                ) : (
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      Entre {FIELD_LIMITS.name.min} y {FIELD_LIMITS.name.max} caracteres
                    </span>
                  </label>
                )}
              </div>

              {/* Email */}
              <div className="form-control">
                <label className="label" htmlFor="email">
                  <span className="label-text font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                    Correo electrónico
                    <span className="text-error" aria-hidden="true">*</span>
                  </span>
                  <span className={`label-text-alt ${getCharacterProgress(formData.email.length, FIELD_LIMITS.email.max)}`}>
                    {formData.email.length}/{FIELD_LIMITS.email.max}
                  </span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={FIELD_LIMITS.email.max}
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
                      Te enviaremos un correo de verificación
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
                  {formData.password && (
                    <span className={`label-text-alt font-medium ${passwordStrengthPercentage >= 100 ? 'text-success' :
                      passwordStrengthPercentage >= 60 ? 'text-warning' : 'text-error'
                      }`}>
                      {getPasswordStrengthLabel()}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    maxLength={FIELD_LIMITS.password.max}
                    className={`input input-bordered w-full pr-12 ${actionData?.errors?.password ? 'input-error' : ''}`}
                    placeholder="Mínimo 8 caracteres"
                    required
                    autoComplete="new-password"
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

                {actionData?.errors?.password && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {actionData.errors.password}
                    </span>
                  </label>
                )}

                {formData.password && (
                  <progress
                    className={`progress w-full h-2 mt-2 ${getPasswordStrengthColor()}`}
                    value={passwordStrengthPercentage}
                    max="100"
                    aria-label={`Fortaleza de contraseña: ${getPasswordStrengthLabel()}`}
                  />
                )}

                <div className="bg-base-200 rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-base-content/70 flex items-center gap-1 mb-2">
                    <Info className="w-3 h-3" aria-hidden="true" />
                    La contraseña debe incluir:
                  </p>
                  <ul className="grid grid-cols-1 gap-1">
                    {passwordRequirements.map((req, index) => {
                      const isMet = req.test(formData.password);
                      return (
                        <li
                          key={index}
                          className={`text-xs flex items-center gap-2 ${isMet ? 'text-success' : 'text-base-content/50'}`}
                        >
                          {isMet ? (
                            <CheckCircle className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-current" aria-hidden="true" />
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
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    Confirmar contraseña
                    <span className="text-error" aria-hidden="true">*</span>
                  </span>
                  {showPasswordMatchStatus && (
                    <span className={`label-text-alt font-medium flex items-center gap-1 ${passwordsMatch ? 'text-success' : 'text-error'}`}>
                      {passwordsMatch ? (
                        <>
                          <CheckCircle className="w-3 h-3" aria-hidden="true" />
                          Coinciden
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" aria-hidden="true" />
                          No coinciden
                        </>
                      )}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    maxLength={FIELD_LIMITS.password.max}
                    className={`input input-bordered w-full pr-12 ${actionData?.errors?.confirmPassword
                      ? 'input-error'
                      : showPasswordMatchStatus
                        ? passwordsMatch
                          ? 'input-success'
                          : 'input-error'
                        : ''
                      }`}
                    placeholder="Repite tu contraseña"
                    required
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!actionData?.errors?.confirmPassword || (showPasswordMatchStatus && !passwordsMatch)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {actionData?.errors?.confirmPassword ? (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {actionData.errors.confirmPassword}
                    </span>
                  </label>
                ) : (
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      Escribe nuevamente tu contraseña para confirmarla
                    </span>
                  </label>
                )}
              </div>

              {/* Botón de registro */}
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="btn btn-secondary w-full gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner w-4 h-4" aria-hidden="true" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    Crear Cuenta
                  </>
                )}
              </button>
            </Form>

            <div className="divider text-base-content/50">¿Ya tienes cuenta?</div>

            <Link to="/auth/login" className="btn btn-outline btn-primary w-full">
              Iniciar Sesión
            </Link>

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