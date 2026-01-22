import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
} from "react-router";
import { AlertTriangle } from "lucide-react";

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
    <html lang="es" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
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

// --- ERROR BOUNDARY ACCESIBLE ---

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let statusCode = 500;
  let title = "Ocurrió un error inesperado";
  let message = "Algo salió mal al procesar tu solicitud.";
  let stack: string | undefined;

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
  else if (import.meta.env.DEV && error && error instanceof Error) {
    title = "Error de Aplicación";
    message = error.message;
    stack = error.stack;
  }

  return (
    <main className="hero min-h-screen bg-base-200" role="alert" aria-live="assertive">
      <div className="hero-content text-center">
        <div className="max-w-md space-y-6">

          <div
            className="text-9xl font-extrabold text-primary/10 tracking-widest select-none"
            aria-hidden="true"
          >
            {statusCode}
          </div>

          <div className="card bg-base-100 shadow-xl -mt-16 relative">
            <div className="card-body items-center text-center pt-8">

              <div className="avatar placeholder -mt-14">
                <div className="bg-primary text-primary-content rounded-full w-14 h-14 shadow-lg flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" aria-hidden="true" />
                </div>
              </div>

              <h1 className="card-title text-2xl font-bold mt-2 text-base-content">
                {title}
              </h1>

              <p className="text-base-content/70 mb-4 text-balance">
                {message}
              </p>

              <div className="card-actions w-full">
                <Link
                  to="/"
                  className="btn btn-primary w-full"
                >
                  Volver al Inicio
                </Link>
              </div>
            </div>
          </div>

          {stack && (
            <div className="collapse collapse-arrow bg-error/10 border border-error/20 rounded-box mt-4 text-left">
              <input type="checkbox" aria-label="Ver detalles técnicos del error" />
              <div className="collapse-title text-sm font-semibold text-error">
                Ver detalles técnicos (Solo Dev)
              </div>
              <div className="collapse-content">
                <pre className="text-xs text-error/80 font-mono overflow-x-auto p-2 whitespace-pre-wrap">
                  <code>{stack}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}