// app/routes/home.tsx
import { type ActionFunctionArgs, data } from "react-router";
import { Form, useActionData, useNavigation, Link, useLoaderData } from "react-router";
import { useRef, useState, useEffect } from "react";
import {
  Calculator,
  FileText,
  Images,
  AlertTriangle,
  Rocket,
  CameraIcon,
  MousePointer2
} from "lucide-react";
import pool from "~/utils/db.server";
import { Breadcrumb } from "~/components/Breadcrumb";
import { Alert } from "~/components/Alert";
import { Navbar } from "~/components/Navbar";
import { getOptionalUser } from "~/utils/auth.guard";
import type { Route } from "./+types/home";

import ReCAPTCHA_ from "react-google-recaptcha";
// @ts-ignore
const ReCAPTCHA = ReCAPTCHA_.default || ReCAPTCHA_;

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Registro Seguro | Mi App" },
    { name: "description", content: "Formulario de registro seguro con validación de Captcha" },
  ];
}

// --- LOADER ---
export async function loader({ request }: Route.LoaderArgs) {
  // Obtener usuario opcionalmente (no redirige si no está autenticado)
  const user = await getOptionalUser(request);
  return { user };
}

// --- BACKEND ---
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const captchaToken = formData.get("g-recaptcha-response");
  const usuarioData = formData.get("datoUsuario");

  if (!usuarioData || usuarioData.toString().trim() === "") {
    return data(
      { success: false, error: "El dato de usuario es obligatorio.", message: null },
      { status: 400 }
    );
  }

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
  const captchaRes = await fetch(verifyUrl, { method: "POST" });
  const captchaJson = await captchaRes.json();

  if (!captchaJson.success) {
    return data(
      { success: false, error: "Verificación de seguridad fallida. Por favor, intenta de nuevo.", message: null },
      { status: 400 }
    );
  }

  try {
    await pool.execute(
      'INSERT INTO captcha (nombre) VALUES (?)',
      [usuarioData]
    );
    return data({ success: true, message: "¡Datos guardados correctamente!", error: null });
  } catch (err) {
    console.error(err);
    return data(
      { success: false, error: "No se pudo conectar con la base de datos.", message: null },
      { status: 500 }
    );
  }
}

// --- FRONTEND ---
export default function Index() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const recaptchaRef = useRef<any>(null);

  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (actionData?.error && errorRef.current) {
      errorRef.current.focus();
    }
    if (actionData?.success && successRef.current) {
      successRef.current.focus();
      if (recaptchaRef.current) recaptchaRef.current.reset();
      setCaptchaValue(null);
    }
  }, [actionData]);

  const isSubmitting = navigation.state === "submitting";

  const onCaptchaChange = (token: string | null) => {
    setCaptchaValue(token);
  };

  // Enlaces de navegación
  const navLinks = [
    {
      to: "/calculadora",
      icon: Calculator,
      label: "Calculadora",
      description: "Suma y divide números",
      color: "btn-primary",
    },
    {
      to: "/formulario",
      icon: FileText,
      label: "Formulario",
      description: "Con validación de campos",
      color: "btn-secondary",
    },
    {
      to: "/carrusel",
      icon: Images,
      label: "Carrusel con Fetch API",
      description: "Galería con Lorem Picsum con Fetch API",
      color: "btn-accent",
    },
    {
      to: "/hola-mundo",
      icon: Rocket,
      label: "Hola Mundo",
      description: "Página de bienvenida",
      color: "btn-info",
    },
    {
      to: "/galeria",
      icon: CameraIcon,
      label: "Galería Cloudinary",
      description: "Subida de imágenes real",
      color: "btn-warning",
    },
    {
      to: "/dom-manipulation",
      icon: MousePointer2,
      label: "Manipulación DOM",
      description: "useRef, Canvas, Focus, Observers",
      color: "btn-success",
    },
  ];

  return (
    <main className="min-h-screen bg-base-200 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Navbar con estado de autenticación */}
        <Navbar user={user} currentPath="/" />

        {/* Mensaje de bienvenida si está autenticado */}
        {user && (
          <div className="alert alert-success mb-6 shadow-lg">
            <div>
              <span className="font-medium">
                ¡Hola, {user.fullName}!
              </span>
              <span className="text-sm opacity-80 ml-2">
                Estás conectado con el correo {user.email}
              </span>
            </div>
          </div>
        )}

        {/* Breadcrumb - en home mostramos solo "Inicio" actual */}
        <Breadcrumb items={[]} />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card del Formulario Principal */}
          <section aria-labelledby="form-title" className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="text-center">
                <h1 id="form-title" className="text-3xl font-bold text-base-content">
                  Registro Seguro
                </h1>
                <p className="py-2 text-base-content/70">
                  Ingresa los datos solicitados para continuar.
                </p>
              </div>

              {/* Mensajes de Feedback */}
              {actionData?.error && (
                <Alert
                  type="error"
                  message={actionData?.error}
                  dismissible={true}
                  className="mt-2"
                />
              )}

              {actionData?.success && (
                <Alert
                  type="success"
                  message={actionData?.message}
                  dismissible={true}
                  autoClose={5000}
                  className="mt-2"
                />
              )}

              <Form method="post" className="space-y-6 mt-4" noValidate>
                <fieldset className="fieldset">
                  <label className="fieldset-label font-medium" htmlFor="datoUsuario">
                    Dato a insertar
                    <span className="text-error ml-1" aria-hidden="true">*</span>
                    <span className="sr-only">(campo obligatorio)</span>
                  </label>
                  <input
                    id="datoUsuario"
                    type="text"
                    name="datoUsuario"
                    required
                    aria-required="true"
                    aria-invalid={actionData?.error ? "true" : "false"}
                    aria-describedby={actionData?.error ? "form-feedback" : undefined}
                    className={`input input-bordered w-full ${actionData?.error ? 'input-error' : ''}`}
                    placeholder="Ej: Nombre de usuario"
                  />
                </fieldset>

                {/* ReCAPTCHA Wrapper */}
                <div className="flex justify-center min-h-[78px] relative">
                  {isClient ? (
                    <div aria-label="Verificación de seguridad">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                        onChange={onCaptchaChange}
                        hl="es"
                      />
                    </div>
                  ) : (
                    <div
                      role="status"
                      aria-busy="true"
                      className="skeleton w-[304px] h-[78px] flex items-center justify-center bg-base-200"
                    >
                      <span className="text-sm text-base-content/60 font-medium">
                        Cargando seguridad...
                      </span>
                    </div>
                  )}

                  <input
                    type="hidden"
                    name="g-recaptcha-response"
                    value={captchaValue || ""}
                  />
                </div>

                {/* Botón de Enviar */}
                <button
                  type="submit"
                  disabled={!captchaValue || isSubmitting}
                  className="btn btn-primary w-full gap-2 disabled:bg-opacity-50"
                  aria-disabled={!captchaValue || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner w-4 h-4" aria-hidden="true"></span>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    "Guardar en Base de Datos"
                  )}
                </button>
              </Form>
            </div>
          </section>

          {/* Card de Navegación */}
          <section aria-labelledby="nav-title" className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 id="nav-title" className="card-title text-2xl mb-4">
                Explorar Funcionalidades
              </h2>

              <nav aria-label="Navegación principal" className="space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`btn ${link.color} w-full justify-start gap-3 h-auto py-3`}
                  >
                    <link.icon className="w-6 h-6" aria-hidden="true" />
                    <div className="text-left">
                      <div className="font-semibold">{link.label}</div>
                      <div className="text-xs opacity-80">{link.description}</div>
                    </div>
                  </Link>
                ))}
              </nav>

              <div className="divider">Herramientas de Desarrollo</div>

              {/* Botón para mostrar error */}
              <Link
                to="/trigger-error"
                className="btn btn-outline btn-error w-full gap-2"
              >
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                Mostrar Pantalla de Error
              </Link>

              <p className="text-xs text-base-content/50 text-center mt-2">
                Este botón dispara un error intencional para probar el ErrorBoundary
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}