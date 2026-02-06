// app/routes/calculadora.tsx
import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { Calculator, Plus, Divide, RotateCcw, AlertCircle } from "lucide-react";
import { Breadcrumb } from "~/components/Breadcrumb";
import { Navbar } from "~/components/Navbar";
import { getOptionalUser } from "~/utils/auth.guard";
import type { Route } from "./+types/calculadora";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Calculadora | Mi App" },
    { name: "description", content: "Calculadora simple para sumar y dividir" },
  ];
}

// ✅ AGREGAR LOADER
export async function loader({ request }: Route.LoaderArgs) {
  const user = await getOptionalUser(request);
  return { user };
}

export default function Calculadora() {
  // ✅ OBTENER USER DEL LOADER
  const { user } = useLoaderData<typeof loader>();
  
  const [numero1, setNumero1] = useState<string>("");
  const [numero2, setNumero2] = useState<string>("");
  const [resultado, setResultado] = useState<number | null>(null);
  const [operacion, setOperacion] = useState<string>("");
  const [error, setError] = useState<string>("");

  const limpiarError = () => setError("");

  const validarNumeros = (): boolean => {
    if (numero1.trim() === "" || numero2.trim() === "") {
      setError("Por favor, ingresa ambos números.");
      return false;
    }
    
    const n1 = parseFloat(numero1);
    const n2 = parseFloat(numero2);
    
    if (isNaN(n1) || isNaN(n2)) {
      setError("Por favor, ingresa números válidos.");
      return false;
    }
    
    return true;
  };

  const sumar = () => {
    limpiarError();
    if (!validarNumeros()) return;
    
    const n1 = parseFloat(numero1);
    const n2 = parseFloat(numero2);
    setResultado(n1 + n2);
    setOperacion(`${n1} + ${n2}`);
  };

  const dividir = () => {
    limpiarError();
    if (!validarNumeros()) return;
    
    const n1 = parseFloat(numero1);
    const n2 = parseFloat(numero2);
    
    if (n2 === 0) {
      setError("No se puede dividir entre cero.");
      setResultado(null);
      return;
    }
    
    setResultado(n1 / n2);
    setOperacion(`${n1} ÷ ${n2}`);
  };

  const limpiar = () => {
    setNumero1("");
    setNumero2("");
    setResultado(null);
    setOperacion("");
    setError("");
  };

  return (
    <main className="min-h-screen bg-base-200 p-4">
      <div className="container mx-auto max-w-lg">
        {/* ✅ AGREGAR NAVBAR */}
        <Navbar user={user} currentPath="/calculadora" />
        
        <Breadcrumb items={[{ label: "Calculadora" }]} />

        <section 
          aria-labelledby="calc-title" 
          className="card bg-base-100 shadow-xl"
        >
          {/* ... resto del contenido igual ... */}
          <div className="card-body">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-12 h-12 flex items-center justify-center">
                  <Calculator className="w-6 h-6" aria-hidden="true" />
                </div>
              </div>
              <div>
                <h1 id="calc-title" className="card-title text-2xl">
                  Calculadora
                </h1>
                <p className="text-base-content/60 text-sm">
                  Suma y división de números
                </p>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div role="alert" className="alert alert-error mb-4">
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-4">
              <div className="form-control">
                <label className="label" htmlFor="numero1">
                  <span className="label-text font-medium">Primer número</span>
                </label>
                <input
                  id="numero1"
                  type="number"
                  inputMode="decimal"
                  value={numero1}
                  onChange={(e) => {
                    setNumero1(e.target.value);
                    limpiarError();
                  }}
                  className="input input-bordered w-full"
                  placeholder="Ej: 10"
                />
              </div>

              <div className="form-control">
                <label className="label" htmlFor="numero2">
                  <span className="label-text font-medium">Segundo número</span>
                </label>
                <input
                  id="numero2"
                  type="number"
                  inputMode="decimal"
                  value={numero2}
                  onChange={(e) => {
                    setNumero2(e.target.value);
                    limpiarError();
                  }}
                  className="input input-bordered w-full"
                  placeholder="Ej: 5"
                />
              </div>
            </div>

            {/* Botones de operación */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={sumar}
                className="btn btn-primary gap-2"
              >
                <Plus className="w-5 h-5" />
                Sumar
              </button>
              <button
                type="button"
                onClick={dividir}
                className="btn btn-secondary gap-2"
              >
                <Divide className="w-5 h-5" />
                Dividir
              </button>
            </div>

            {/* Resultado */}
            {resultado !== null && (
              <div className="stats shadow mt-6 w-full bg-gradient-to-r from-primary/10 to-secondary/10">
                <div className="stat">
                  <div className="stat-title">Operación</div>
                  <div className="stat-value text-primary text-2xl">
                    {resultado % 1 !== 0 ? resultado.toFixed(4) : resultado}
                  </div>
                  <div className="stat-desc text-base">{operacion}</div>
                </div>
              </div>
            )}

            {/* Botón Limpiar */}
            <button
              type="button"
              onClick={limpiar}
              className="btn btn-outline btn-ghost gap-2 mt-4"
            >
              <RotateCcw className="w-4 h-4" />
              Limpiar todo
            </button>

            <div className="divider">Navegación</div>

            <Link to="/" className="btn btn-ghost">
              ← Volver al Inicio
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}