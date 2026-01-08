// app/routes/home.tsx
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hola Mundo Estilizado" },
    { name: "description", content: "React Router v7 con Tailwind CSS" },
  ];
}

export default function Home() {
  return (
    // CONTENEDOR PRINCIPAL.
    // min-h-screen: Ocupa toda la altura de la pantalla
    // flex items-center justify-center: Centra el contenido vertical y horizontalmente
    // bg-gradient-to-br...: Crea un fondo degradado de azul a púrpura
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-blue-600 to-dark-500">
      
      {/* TARJETA (CARD) */}
      {/* max-w-md: Ancho máximo mediano */}
      {/* bg-white/95: Fondo blanco con un poco de transparencia */}
      {/* backdrop-blur: Efecto de desenfoque detrás de la tarjeta */}
      {/* rounded-2xl: Bordes muy redondeados */}
      {/* shadow-2xl: Sombra pronunciada para dar profundidad */}
      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-[1.02]">
        
        <div className="text-center space-y-6">
          {/* ICONO / LOGO SIMULADO */}
          <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🚀</span>
          </div>

          {/* TÍTULO */}
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            ¡Hola <span className="text-red-600">Mundo!</span>
          </h1>

          {/* TEXTO DESCRIPTIVO */}
          <p className="text-lg text-gray-600 leading-relaxed">
             Esta es mi primera app usando{" "}
            <span className="font-semibold text-gray-800">React Router v7</span>{" "}
            y{" "}
            <span className="font-semibold text-sky-500">Tailwind CSS</span>.
          </p>

          {/* BOTÓN */}
          <div className="pt-4">
            <button className="w-full py-3 px-6 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors shadow-lg hover:shadow-xl cursor-pointer">
              Botón de prueba
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}