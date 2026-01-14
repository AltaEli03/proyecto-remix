import { type ActionFunctionArgs, data } from "react-router";
import { Form, useActionData, useNavigation, Link } from "react-router";
import { useRef, useState, useEffect } from "react";
import pool from "~/db.server";
import type { Route } from "./+types/home";

import ReCAPTCHA_ from "react-google-recaptcha";
// @ts-ignore
const ReCAPTCHA = ReCAPTCHA_.default || ReCAPTCHA_;

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Prueba de Captcha" },
    { name: "description", content: "Prueba con Base de datos" },
  ];
}

// --- BACKEND: SERVER ACTION ---
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const captchaToken = formData.get("g-recaptcha-response");
  const usuarioData = formData.get("datoUsuario");

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;

  const captchaRes = await fetch(verifyUrl, { method: "POST" });
  const captchaJson = await captchaRes.json();

  if (!captchaJson.success) {
    // CORRECCIÓN AQUÍ: Devolvemos una estructura consistente
    return data(
      { success: false, error: "Captcha inválido o eres un robot 🤖", message: null },
      { status: 400 }
    );
  }

  try {
    await pool.execute(
      'INSERT INTO usuarios (nombre) VALUES (?)',
      [usuarioData]
    );

    // CORRECCIÓN AQUÍ: Agregamos error: null
    return data({ success: true, message: "¡Datos guardados correctamente!", error: null });
  } catch (err) {
    console.error(err);
    // CORRECCIÓN AQUÍ: Estructura consistente
    return data(
      { success: false, error: "Error de base de datos", message: null },
      { status: 500 }
    );
  }
}

// --- FRONTEND: COMPONENTE ---
export default function Index() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const recaptchaRef = useRef<any>(null);
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isSubmitting = navigation.state === "submitting";

  const onCaptchaChange = (token: string | null) => {
    setCaptchaValue(token);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200">

        {/* Encabezado */}
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            Registro Seguro
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa los datos a continuación
          </p>
        </div>

        <Form method="post" className="mt-8 space-y-6">
          {/* Input Group */}
          <div>
            <label htmlFor="datoUsuario" className="block text-sm font-medium gray-black-700">
              Dato a insertar
            </label>
            <div className="mt-1">
              <input
                id="datoUsuario"
                type="text"
                name="datoUsuario"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                placeholder="Escribe algo aquí..."
              />
            </div>
          </div>

          {/* ReCAPTCHA Wrapper */}
          <div className="flex justify-center min-h-[78px]">
            {isClient ? (
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={onCaptchaChange}
              />
            ) : (
              <div className="w-[304px] h-[78px] bg-gray-100 rounded animate-pulse flex items-center justify-center text-xs text-gray-400">
                Cargando seguridad...
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
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors duration-200 
              ${(!captchaValue || isSubmitting)
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              }`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </span>
            ) : (
              "Guardar en Base de Datos"
            )}
          </button>
        </Form>

        {/*  BOTÓN DE REDIRECCIÓN */}
        <div className="mt-6 border-t pt-6 text-center">
          <Link
            to="/hola-mundo"
            className="inline-flex items-center justify-center w-full px-4 py-2 border border-purple-500 text-base font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition-colors duration-200"
          >
            Ir a Hola Mundo 🚀
          </Link>
        </div>

        {/* Mensajes de Feedback */}
        {/* TypeScript ahora sabe que 'error' existe en el tipo (puede ser string o null) */}
        {actionData?.error && (
          <div className="rounded-md bg-red-50 p-4 border-l-4 border-red-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">
                  {actionData.error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TypeScript ahora sabe que 'success' y 'message' existen en el tipo */}
        {actionData?.success && (
          <div className="rounded-md bg-green-50 p-4 border-l-4 border-green-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700 font-medium">
                  {actionData.message}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}