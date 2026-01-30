// app/routes/dom-manipulation.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
    MousePointer2,
    Palette,
    Move,
    Type,
    Square,
    Circle,
    Sparkles,
    RotateCcw,
    Play,
    Pause,
    Zap,
    Eye,
    Box
} from "lucide-react";
import { Breadcrumb } from "~/components/Breadcrumb";
import type { Route } from "./+types/home";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Manipulación del DOM | Mi App" },
        { name: "description", content: "Ejemplos de manipulación directa del DOM en React" },
    ];
}

// ===========================================
// EJEMPLO 1: Cambio de estilos dinámicos
// ===========================================
function EjemploEstilos() {
    const boxRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // CORRECCIÓN 1: Usamos useRef para guardar el estado del color (hue)
    // Así, al detener y reanudar, la animación sigue donde se quedó.
    const hueRef = useRef(0);

    const cambiarColor = () => {
        if (boxRef.current) {
            const colores = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];
            const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];

            boxRef.current.style.backgroundColor = colorAleatorio;
            boxRef.current.style.transform = `rotate(${Math.random() * 360}deg)`;
            boxRef.current.style.borderRadius = `${Math.random() * 50}%`;
        }
    };

    useEffect(() => {
        if (!isAnimating || !boxRef.current) return;

        let animationId: number;

        const animate = () => {
            if (boxRef.current) {
                // Actualizamos el valor en la referencia
                hueRef.current = (hueRef.current + 2) % 360;

                boxRef.current.style.backgroundColor = `hsl(${hueRef.current}, 70%, 60%)`;
                boxRef.current.style.transform = `rotate(${hueRef.current}deg) scale(${1 + Math.sin(hueRef.current * 0.05) * 0.2})`;
            }
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationId);
    }, [isAnimating]);

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Manipulación de Estilos
                </h2>
                <p className="text-sm text-base-content/70">
                    Usa <code className="badge badge-neutral badge-sm">useRef</code> para acceder al elemento y modificar sus estilos directamente.
                </p>

                <div className="flex justify-center py-6">
                    <div
                        ref={boxRef}
                        className={`w-32 h-32 bg-primary rounded-lg shadow-lg flex items-center justify-center ${isAnimating ? '' : 'transition-all duration-300'
                            }`}
                    >
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={cambiarColor} className="btn btn-primary btn-sm gap-2">
                        <Zap className="w-4 h-4" />
                        Cambiar Estilo
                    </button>
                    <button
                        onClick={() => setIsAnimating(!isAnimating)}
                        className={`btn btn-sm gap-2 ${isAnimating ? 'btn-error' : 'btn-success'}`}
                    >
                        {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isAnimating ? 'Detener' : 'Animar'}
                    </button>
                </div>

                {/* Código de ejemplo */}
                <div className="mockup-code mt-4 text-xs">
                    <pre data-prefix="1"><code>{`const boxRef = useRef<HTMLDivElement>(null);`}</code></pre>
                    <pre data-prefix="2"><code>{``}</code></pre>
                    <pre data-prefix="3"><code>{`// Manipulación directa del DOM`}</code></pre>
                    <pre data-prefix="4"><code>{`boxRef.current.style.backgroundColor = color;`}</code></pre>
                    <pre data-prefix="5"><code>{`boxRef.current.style.transform = 'rotate(45deg)';`}</code></pre>
                </div>
            </div>
        </div>
    );
}

// ===========================================
// EJEMPLO 2: Canvas - Dibujo libre
// ===========================================
function EjemploCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("#FF6B6B");
    const [brushSize, setBrushSize] = useState(5);

    // Inicializar canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;


        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Configurar canvas
        ctx.fillStyle = "#1d232a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const preventScroll = (e: TouchEvent) => e.preventDefault();
        canvas.addEventListener('touchmove', preventScroll, { passive: false });

        return () => canvas.removeEventListener('touchmove', preventScroll);
    }, []);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return;

        setIsDrawing(true);
        const { x, y } = getCoordinates(e);

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return;

        const { x, y } = getCoordinates(e);

        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;

        ctx.fillStyle = "#1d232a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const colores = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FFFFFF"];

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title flex items-center gap-2">
                    <Square className="w-5 h-5 text-secondary" />
                    Canvas - Área de Dibujo
                </h2>
                <p className="text-sm text-base-content/70">
                    Manipulación del elemento <code className="badge badge-neutral badge-sm">&lt;canvas&gt;</code> para dibujar libremente.
                </p>

                {/* Controles */}
                <div className="flex flex-wrap gap-4 items-center justify-center">
                    <div className="flex gap-1">
                        {colores.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
                                    }`}
                                style={{ backgroundColor: c }}
                                aria-label={`Color ${c}`}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm">Tamaño:</span>
                        <input
                            type="range"
                            min="1"
                            max="30"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="range range-primary range-xs w-24"
                        />
                        <span className="badge badge-sm">{brushSize}px</span>
                    </div>

                    <button onClick={clearCanvas} className="btn btn-ghost btn-sm gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Limpiar
                    </button>
                </div>

                {/* Canvas */}
                <div className="flex justify-center mt-4">
                    <canvas
                        ref={canvasRef}
                        width={350}
                        height={250}
                        className="rounded-lg cursor-crosshair border touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>

                {/* Código de ejemplo */}
                <div className="mockup-code mt-4 text-xs">
                    <pre data-prefix="1"><code>{`const ctx = canvasRef.current.getContext("2d");`}</code></pre>
                    <pre data-prefix="2"><code>{`ctx.strokeStyle = color;`}</code></pre>
                    <pre data-prefix="3"><code>{`ctx.lineTo(x, y);`}</code></pre>
                    <pre data-prefix="4"><code>{`ctx.stroke();`}</code></pre>
                </div>
            </div>
        </div>
    );
}

// ===========================================
// EJEMPLO 3: Focus Management
// ===========================================
function EjemploFocus() {
    const input1Ref = useRef<HTMLInputElement>(null);
    const input2Ref = useRef<HTMLInputElement>(null);
    const input3Ref = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const [currentFocus, setCurrentFocus] = useState<string>("");

    // Array de refs para navegar entre ellos
    const inputRefs = [input1Ref, input2Ref, input3Ref, buttonRef];

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === "ArrowDown" || e.key === "Enter") {
            e.preventDefault();
            const nextIndex = (index + 1) % inputRefs.length;
            inputRefs[nextIndex].current?.focus();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prevIndex = index === 0 ? inputRefs.length - 1 : index - 1;
            inputRefs[prevIndex].current?.focus();
        }
    };

    // Detectar cuál tiene el foco
    const handleFocus = (name: string) => {
        setCurrentFocus(name);
    };

    // Enfocar el primer input al montar
    useEffect(() => {
        input1Ref.current?.focus({ preventScroll: true })
    }, []);

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title flex items-center gap-2">
                    <Eye className="w-5 h-5 text-accent" />
                    Gestión del Focus
                </h2>
                <p className="text-sm text-base-content/70">
                    Usa las flechas <kbd className="kbd kbd-sm">↑</kbd> <kbd className="kbd kbd-sm">↓</kbd> o <kbd className="kbd kbd-sm">Enter</kbd> para navegar.
                </p>

                {/* Indicador de focus actual */}
                <div className="alert alert-info py-2">
                    <span>Focus actual: <strong>{currentFocus || "Ninguno"}</strong></span>
                </div>

                <div className="space-y-3">
                    <input
                        ref={input1Ref}
                        type="text"
                        placeholder="Campo 1 - Nombre"
                        className="input input-bordered w-full"
                        onKeyDown={(e) => handleKeyDown(e, 0)}
                        onFocus={() => handleFocus("Campo 1 - Nombre")}
                    />
                    <input
                        ref={input2Ref}
                        type="email"
                        placeholder="Campo 2 - Email"
                        className="input input-bordered w-full"
                        onKeyDown={(e) => handleKeyDown(e, 1)}
                        onFocus={() => handleFocus("Campo 2 - Email")}
                    />
                    <input
                        ref={input3Ref}
                        type="tel"
                        placeholder="Campo 3 - Teléfono"
                        className="input input-bordered w-full"
                        onKeyDown={(e) => handleKeyDown(e, 2)}
                        onFocus={() => handleFocus("Campo 3 - Teléfono")}
                    />
                    <button
                        ref={buttonRef}
                        className="btn btn-primary w-full"
                        onKeyDown={(e) => handleKeyDown(e, 3)}
                        onFocus={() => handleFocus("Botón Enviar")}
                    >
                        Enviar
                    </button>
                </div>

                {/* Código de ejemplo */}
                <div className="mockup-code mt-4 text-xs">
                    <pre data-prefix="1"><code>{`const inputRef = useRef<HTMLInputElement>(null);`}</code></pre>
                    <pre data-prefix="2"><code>{``}</code></pre>
                    <pre data-prefix="3"><code>{`// Enfocar programáticamente`}</code></pre>
                    <pre data-prefix="4"><code>{`inputRef.current?.focus();`}</code></pre>
                </div>
            </div>
        </div>
    );
}

// ===========================================
// EJEMPLO 4: Intersection Observer
// ===========================================
function EjemploIntersectionObserver() {
    const observedRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());

    useEffect(() => {
        const currentRefs = observedRefs.current.filter(Boolean);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const index = Number(entry.target.getAttribute("data-index"));
                    setVisibleItems((prev) => {
                        const newSet = new Set(prev);
                        if (entry.isIntersecting) {
                            newSet.add(index);
                        } else {
                            newSet.delete(index);
                        }
                        return newSet;
                    });
                });
            },
            {
                threshold: 0.5, // 50% visible
                rootMargin: "0px",
            }
        );

        currentRefs.forEach((ref) => observer.observe(ref!));

        return () => {
            currentRefs.forEach((ref) => observer.unobserve(ref!));
            observer.disconnect();
        };
    }, []);

    const items = [
        { icon: Box, color: "bg-red-500", label: "Elemento 1" },
        { icon: Circle, color: "bg-blue-500", label: "Elemento 2" },
        { icon: Square, color: "bg-green-500", label: "Elemento 3" },
        { icon: Sparkles, color: "bg-yellow-500", label: "Elemento 4" },
        { icon: Zap, color: "bg-purple-500", label: "Elemento 5" },
    ];

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title flex items-center gap-2">
                    <Move className="w-5 h-5 text-warning" />
                    Intersection Observer
                </h2>
                <p className="text-sm text-base-content/70">
                    Detecta cuándo los elementos entran o salen del viewport. Haz scroll en el contenedor.
                </p>

                {/* Indicador de elementos visibles */}
                <div className="flex gap-2 flex-wrap">
                    {items.map((_, i) => (
                        <span
                            key={i}
                            className={`badge ${visibleItems.has(i) ? 'badge-success' : 'badge-ghost'}`}
                        >
                            {i + 1} {visibleItems.has(i) ? '👁️' : ''}
                        </span>
                    ))}
                </div>

                {/* Contenedor scrolleable */}
                <div className="h-48 overflow-y-auto border border-base-300 rounded-lg p-4 space-y-4 mt-4">
                    {items.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={index}
                                ref={(el) => { observedRefs.current[index] = el; }}
                                data-index={index}
                                className={`
                  p-4 rounded-lg flex items-center gap-3 transition-all duration-500
                  ${item.color} text-white
                  ${visibleItems.has(index) ? 'scale-100 opacity-100' : 'scale-90 opacity-50'}
                `}
                            >
                                <Icon className="w-6 h-6" />
                                <span className="font-semibold">{item.label}</span>
                                {visibleItems.has(index) && (
                                    <span className="ml-auto badge badge-neutral">Visible</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Código de ejemplo */}
                <div className="mockup-code mt-4 text-xs">
                    <pre data-prefix="1"><code>{`const observer = new IntersectionObserver(`}</code></pre>
                    <pre data-prefix="2"><code>{`  (entries) => {`}</code></pre>
                    <pre data-prefix="3"><code>{`    entries.forEach((entry) => {`}</code></pre>
                    <pre data-prefix="4"><code>{`      if (entry.isIntersecting) { ... }`}</code></pre>
                    <pre data-prefix="5"><code>{`    });`}</code></pre>
                    <pre data-prefix="6"><code>{`  }, { threshold: 0.5 }`}</code></pre>
                    <pre data-prefix="7"><code>{`);`}</code></pre>
                </div>
            </div>
        </div>
    );
}

// ===========================================
// EJEMPLO 5: Manipulación de texto/contenido
// ===========================================
function EjemploTexto() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [texto, setTexto] = useState("¡Haz clic en una palabra para resaltarla!");

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "SPAN") {
            // Toggle clase de resaltado
            target.classList.toggle("bg-primary");
            target.classList.toggle("text-primary-content");
            target.classList.toggle("px-1");
            target.classList.toggle("rounded");
        }
    }, []);

    const resaltarTodo = () => {
        if (containerRef.current) {
            const spans = containerRef.current.querySelectorAll("span");
            spans.forEach((span) => {
                span.classList.add("bg-primary", "text-primary-content", "px-1", "rounded");
            });
        }
    };

    const limpiarResaltado = () => {
        if (containerRef.current) {
            const spans = containerRef.current.querySelectorAll("span");
            spans.forEach((span) => {
                span.classList.remove("bg-primary", "text-primary-content", "px-1", "rounded");
            });
        }
    };

    // Convertir texto en spans por palabra
    const palabras = texto.split(" ");

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title flex items-center gap-2">
                    <Type className="w-5 h-5 text-info" />
                    Manipulación de Texto
                </h2>
                <p className="text-sm text-base-content/70">
                    Haz clic en las palabras para resaltarlas. Usa <code className="badge badge-neutral badge-sm">classList</code> para modificar clases.
                </p>

                {/* Contenedor de texto */}
                <div
                    ref={containerRef}
                    onClick={handleClick}
                    className="p-4 bg-base-200 rounded-lg text-lg cursor-pointer select-none min-h-[80px] flex flex-wrap gap-2"
                >
                    {palabras.map((palabra, index) => (
                        <span
                            key={index}
                            className="transition-all duration-200 hover:scale-110"
                        >
                            {palabra}
                        </span>
                    ))}
                </div>

                {/* Input para cambiar texto */}
                <div className="form-control mt-4">
                    <input
                        type="text"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="Escribe tu texto aquí..."
                    />
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={resaltarTodo} className="btn btn-primary btn-sm">
                        Resaltar Todo
                    </button>
                    <button onClick={limpiarResaltado} className="btn btn-ghost btn-sm">
                        Limpiar
                    </button>
                </div>

                {/* Código de ejemplo */}
                <div className="mockup-code mt-4 text-xs">
                    <pre data-prefix="1"><code>{`// Agregar/quitar clases`}</code></pre>
                    <pre data-prefix="2"><code>{`element.classList.toggle("bg-primary");`}</code></pre>
                    <pre data-prefix="3"><code>{`element.classList.add("highlight");`}</code></pre>
                    <pre data-prefix="4"><code>{`element.classList.remove("highlight");`}</code></pre>
                </div>
            </div>
        </div>
    );
}

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================
export default function DOMManipulation() {
    return (
        <main className="min-h-screen bg-base-200 p-4">
            <div className="container mx-auto max-w-6xl">
                <Breadcrumb items={[{ label: "Manipulación DOM" }]} />

                {/* Header */}
                <div className="card bg-gradient-to-r from-primary/20 to-secondary/20 shadow-xl mb-6">
                    <div className="card-body">
                        <div className="flex items-center gap-4">
                            <div className="avatar placeholder">
                                <div className="bg-primary text-primary-content rounded-full w-16 h-16 flex items-center justify-center">
                                    <MousePointer2 className="w-8 h-8" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Manipulación del DOM</h1>
                                <p className="text-base-content/70">
                                    Ejemplos prácticos de cómo manipular el DOM directamente en React usando <code className="badge badge-neutral">useRef</code> y <code className="badge badge-neutral">useEffect</code>
                                </p>
                            </div>
                        </div>

                        {/* Cuándo usar manipulación directa */}
                        <div className="alert alert-info mt-4">
                            <div>
                                <h3 className="font-bold">¿Cuándo manipular el DOM directamente?</h3>
                                <ul className="text-sm mt-1 list-disc list-inside">
                                    <li>Integración con librerías no-React (D3, Chart.js, etc.)</li>
                                    <li>Gestión del focus y accesibilidad</li>
                                    <li>Animaciones complejas con Canvas o requestAnimationFrame</li>
                                    <li>Medición de elementos (getBoundingClientRect)</li>
                                    <li>Intersection Observer, ResizeObserver, etc.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid de ejemplos */}
                <div className="grid gap-6 md:grid-cols-2">
                    <EjemploEstilos />
                    <EjemploCanvas />
                    <EjemploFocus />
                    <EjemploIntersectionObserver />
                    <div className="md:col-span-2">
                        <EjemploTexto />
                    </div>
                </div>

                {/* Navegación */}
                <div className="card bg-base-100 shadow-xl mt-6">
                    <div className="divider">Navegación</div>

                    <Link to="/" className="btn btn-ghost">
                        ← Volver al Inicio
                    </Link>
                </div>
            </div>
        </main>
    );
}