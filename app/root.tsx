import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// --- ERROR BOUNDARY PERSONALIZADO ---

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let statusCode = 500;
  let title = "Ocurrió un error inesperado";
  let message = "Algo salió mal al procesar tu solicitud.";
  let stack: string | undefined;

  // Manejo de respuestas HTTP (404, 400, 500 lanzados manualmente)
  if (isRouteErrorResponse(error)) {
    statusCode = error.status;

    switch (error.status) {
      case 404:
        title = "Página no encontrada";
        message = "Lo sentimos, la página que buscas no existe o ha sido movida.";
        break;
      case 401:
        title = "No autorizado";
        message = "No tienes permisos para acceder a esta sección.";
        break;
      case 400:
        title = "Petición incorrecta";
        message = "Hubo un problema con los datos enviados.";
        break;
      case 500:
        title = "Error del servidor";
        message = "Nuestros servidores están teniendo problemas. Inténtalo más tarde.";
        break;
      default:
        title = error.statusText || "Error";
        message = error.data?.message || message;
    }
  }
  // Manejo de errores de código (JavaScript crash)
  else if (import.meta.env.DEV && error && error instanceof Error) {
    title = "Error de Aplicación";
    message = error.message;
    stack = error.stack;
  }

  return (
    // Contenedor principal centrado con Tailwind
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-6">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Código de estado grande */}
        <h1 className="text-9xl font-extrabold text-indigo-100 tracking-widest">
          {statusCode}
        </h1>

        <div className="bg-white p-8 rounded-2xl shadow-xl relative -mt-12 mx-4">
          {/* Título del error */}
          <div className="bg-indigo-600 text-white rounded-full p-3 w-fit mx-auto mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {title}
          </h2>

          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {/* Botón para regresar al Index */}
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto"
          >
            Volver al Inicio
          </Link>
        </div>

        {/* Stack Trace (Solo visible en modo desarrollo para errores de JS) */}
        {stack && (
          <div className="mt-8 text-left w-full">
            <details className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer">
              <summary className="text-red-700 font-semibold text-sm">Ver detalles técnicos (Solo Dev)</summary>
              <pre className="mt-2 w-full overflow-x-auto text-xs text-red-800 font-mono p-2">
                <code>{stack}</code>
              </pre>
            </details>
          </div>
        )}
      </div>
    </main>
  );
}