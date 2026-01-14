// app/routes/home.tsx
import type { Route } from "./+types/home";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hola Mundo Estilizado" },
    { name: "description", content: "React Router v7 con Tailwind CSS" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-blue-600 to-dark-500">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-[1.02]">
        
        <div className="text-center space-y-6">
          <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🚀</span>
          </div>

          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            ¡Hola <span className="text-purple-600">Mundo!</span>
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed">
             Esta es mi primera app usando{" "}
            <span className="font-semibold text-gray-800">React Router v7</span>.
          </p>

          <div className="pt-4">
            {/* 2. CAMBIO: Usamos Link en lugar de button para volver al inicio */}
            <Link 
              to="/" 
              className="block w-full py-3 px-6 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors shadow-lg hover:shadow-xl text-center"
            >
              Volver al Registro
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}