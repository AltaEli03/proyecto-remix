import type { Route } from "./+types/home";
import { Link } from "react-router";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Hola Mundo | Bienvenida" },
    { name: "description", content: "Página de demostración de React Router v7 con DaisyUI v5" },
  ];
}

export default function Home() {
  return (
    <main className="hero min-h-screen bg-gradient-to-br from-primary via-secondary to-accent">
      <div className="hero-content">
        <article className="card w-full max-w-md bg-base-100/95 backdrop-blur-sm shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
          <div className="card-body items-center text-center gap-6">

            <div className="avatar placeholder" aria-hidden="true">
              <div className="bg-secondary/20 text-secondary rounded-full w-16 h-16 flex items-center justify-center">
                <span className="text-3xl">🚀</span>
              </div>
            </div>

            <h1 className="card-title text-4xl font-extrabold tracking-tight text-base-content">
              ¡Hola <span className="text-secondary">Mundo!</span>
            </h1>

            <p className="text-lg text-base-content/80 leading-relaxed text-balance">
              Esta es mi primera app usando{" "}
              <strong className="font-bold text-base-content">React Router v7</strong>.
            </p>

            <div className="card-actions w-full pt-2">
              <Link
                to="/"
                className="btn btn-primary w-full shadow-lg"
                aria-label="Volver a la página de registro"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}