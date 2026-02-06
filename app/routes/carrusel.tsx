// app/routes/carrusel.tsx
import { useState, useEffect } from "react";
import { Link, useLoaderData, useFetcher } from "react-router";
import {
  Images,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Code,
  Server,
  Globe,
  CheckCircle,
  Clock
} from "lucide-react";
import { Breadcrumb } from "~/components/Breadcrumb";
import { Navbar } from "~/components/Navbar";
import { getOptionalUser } from "~/utils/auth.guard";
import type { Route } from "./+types/carrusel";

interface ImageData {
  id: string;
  url: string;
  alt: string;
  author: string;
}

interface LoaderData {
  user: any; // ✅ AGREGAR USER AL TIPO
  images: ImageData[];
  fetchInfo: {
    apiUrl: string;
    timestamp: string;
    totalImages: number;
    page: number;
    method: string;
  };
  rawData: Array<{
    id: string;
    author: string;
    width: number;
    height: number;
    url: string;
    download_url: string;
  }>;
}

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  // ✅ OBTENER USER
  const user = await getOptionalUser(request);

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || Math.floor(Math.random() * 100) + 1;

  const apiUrl = `https://picsum.photos/v2/list?page=${page}&limit=5`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Response("Error al cargar las imágenes", { status: 500 });
  }

  interface PicsumImage {
    id: string;
    author: string;
    width: number;
    height: number;
    url: string;
    download_url: string;
  }

  const rawData: PicsumImage[] = await response.json();

  const images: ImageData[] = rawData.map((img: PicsumImage) => ({
    id: img.id,
    url: `https://picsum.photos/id/${img.id}/800/400`,
    alt: `Imagen por ${img.author}`,
    author: img.author,
  }));

  return {
    user, // ✅ RETORNAR USER
    images,
    rawData,
    fetchInfo: {
      apiUrl,
      timestamp: new Date().toISOString(),
      totalImages: images.length,
      page,
      method: "GET"
    }
  };
}

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Carrusel de Imágenes | Fetch API Demo" },
    { name: "description", content: "Demostración de Fetch API con Lorem Picsum" },
  ];
}

export default function Carrusel() {
  // ✅ OBTENER USER DEL LOADER
  const { user, images: initialImages, fetchInfo: initialFetchInfo, rawData: initialRawData } = useLoaderData<LoaderData>();
  const fetcher = useFetcher<LoaderData>();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showRawData, setShowRawData] = useState<boolean>(false);

  const images: ImageData[] = fetcher.data?.images ?? initialImages;
  const fetchInfo = fetcher.data?.fetchInfo ?? initialFetchInfo;
  const rawData = fetcher.data?.rawData ?? initialRawData;
  const isLoading: boolean = fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data) {
      setCurrentIndex(0);
    }
  }, [fetcher.data]);

  const loadNewImages = (): void => {
    const randomPage = Math.floor(Math.random() * 100) + 1;
    fetcher.load(`/carrusel?page=${randomPage}`);
  };

  const goToPrevious = (): void => {
    setCurrentIndex((prev: number) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (): void => {
    setCurrentIndex((prev: number) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number): void => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (isLoading || images.length === 0) return;

    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [isLoading, images.length, currentIndex]);

  return (
    <main className="min-h-screen bg-base-200 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* ✅ AGREGAR NAVBAR */}
        <Navbar user={user} currentPath="/carrusel" />

        <Breadcrumb items={[{ label: "Carrusel" }]} />

        {/* ✅ NUEVO: Panel de información de Fetch API */}
        <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 shadow-lg mb-6">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-6 h-6 text-primary" />
              <h2 className="card-title text-lg">🔄 Fetch API Demo</h2>
              <div className="badge badge-primary badge-outline">
                Server-Side
              </div>
            </div>

            {/* Estado de la petición */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Clock className="w-4 h-4 text-warning animate-pulse" />
                    <span className="text-warning font-medium">Cargando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-success font-medium">Datos cargados</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-info" />
                <span className="text-sm">Remix Loader</span>
              </div>

              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-accent" />
                <span className="text-sm">REST API</span>
              </div>
            </div>

            {/* Información de la petición */}
            <div className="bg-base-300 rounded-lg p-4 font-mono text-sm">
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-neutral">METHOD</span>
                  <span className="text-success">{fetchInfo.method}</span>
                </div>

                <div className="flex flex-wrap gap-2 items-start">
                  <span className="badge badge-neutral">URL</span>
                  <a
                    href={fetchInfo.apiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary break-all"
                  >
                    {fetchInfo.apiUrl}
                  </a>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-neutral">PÁGINA</span>
                  <span>{fetchInfo.page}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-neutral">RESULTADOS</span>
                  <span>{fetchInfo.totalImages} imágenes</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-neutral">TIMESTAMP</span>
                  <span className="text-xs">{fetchInfo.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Botón para ver datos crudos */}
            <div className="mt-4">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="btn btn-sm btn-outline gap-2"
              >
                <Code className="w-4 h-4" />
                {showRawData ? "Ocultar" : "Ver"} respuesta JSON
              </button>
            </div>

            {/* Datos crudos de la API */}
            {showRawData && (
              <div className="mt-4">
                <div className="mockup-code text-xs max-h-64 overflow-auto">
                  <pre className="px-4">
                    <code>{JSON.stringify(rawData, null, 2)}</code>
                  </pre>
                </div>
              </div>
            )}
            {/* Código de ejemplo */}
            <div className="collapse collapse-arrow bg-base-200 mt-4">
              <input type="checkbox" />
              <div className="collapse-title font-medium flex items-center gap-2">
                <Code className="w-4 h-4" />
                Ver código del Loader
              </div>
              <div className="collapse-content">
                <div className="mockup-code text-xs">
                  <pre data-prefix="1"><code>{`export async function loader({ request }) {`}</code></pre>
                  <pre data-prefix="2"><code>{`  const url = new URL(request.url);`}</code></pre>
                  <pre data-prefix="3"><code>{`  const page = url.searchParams.get("page");`}</code></pre>
                  <pre data-prefix="4"><code>{``}</code></pre>
                  <pre data-prefix="5" className="bg-warning/20"><code>{`  // ✅ FETCH API`}</code></pre>
                  <pre data-prefix="6" className="bg-success/20"><code>{`  const response = await fetch(`}</code></pre>
                  <pre data-prefix="7" className="bg-success/20"><code>{`    \`https://picsum.photos/v2/list?page=\${page}\``}</code></pre>
                  <pre data-prefix="8" className="bg-success/20"><code>{`  );`}</code></pre>
                  <pre data-prefix="9"><code>{``}</code></pre>
                  <pre data-prefix="10"><code>{`  const data = await response.json();`}</code></pre>
                  <pre data-prefix="11"><code>{`  return { images: data };`}</code></pre>
                  <pre data-prefix="12"><code>{`}`}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section aria-labelledby="carousel-title" className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="avatar placeholder">
                  <div className="bg-accent text-accent-content rounded-full w-12 h-12 flex items-center justify-center">
                    <Images className="w-6 h-6" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <h1 id="carousel-title" className="card-title text-2xl">
                    Galería de Imágenes
                  </h1>
                  <p className="text-base-content/60 text-sm">
                    Imágenes de{" "}
                    <a
                      href="https://picsum.photos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary inline-flex items-center gap-1"
                    >
                      Lorem Picsum
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </p>
                </div>
              </div>

              <button
                onClick={loadNewImages}
                disabled={isLoading}
                className="btn btn-outline btn-primary gap-2"
                aria-label="Cargar nuevas imágenes aleatorias"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Nuevas imágenes
              </button>
            </div>

            {/* Carousel */}
            <div
              className="relative w-full overflow-hidden rounded-xl"
              role="region"
              aria-roledescription="carrusel"
              aria-label="Galería de imágenes aleatorias"
            >
              {isLoading ? (
                <div className="skeleton w-full h-64 md:h-96 flex items-center justify-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              ) : (
                <>
                  {/* Imagen principal */}
                  <div className="relative">
                    <div className="carousel w-full">
                      {images.map((image: ImageData, index: number) => (
                        <div
                          key={image.id}
                          className={`carousel-item w-full transition-opacity duration-500 ${index === currentIndex ? "block" : "hidden"
                            }`}
                          role="group"
                          aria-roledescription="diapositiva"
                          aria-label={`${index + 1} de ${images.length}`}
                          aria-hidden={index !== currentIndex}
                        >
                          <img
                            src={image.url}
                            alt={image.alt}
                            className="w-full h-64 md:h-96 object-cover"
                            loading="lazy"
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                              e.currentTarget.src = `https://picsum.photos/800/400?random=${image.id}`;
                            }}
                          />
                          <div className="absolute top-4 right-4">
                            <span className="badge badge-neutral">
                              📷 {image.author}
                            </span>
                          </div>
                          {/* ✅ NUEVO: Badge con ID de la imagen */}
                          <div className="absolute top-4 left-4">
                            <span className="badge badge-primary">
                              ID: {image.id}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Controles de navegación */}
                    <div className="absolute flex justify-between transform -translate-y-1/2 left-2 right-2 top-1/2">
                      <button
                        onClick={goToPrevious}
                        className="btn btn-circle btn-sm md:btn-md bg-base-100/80 hover:bg-base-100"
                        aria-label="Imagen anterior"
                      >
                        <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                      </button>
                      <button
                        onClick={goToNext}
                        className="btn btn-circle btn-sm md:btn-md bg-base-100/80 hover:bg-base-100"
                        aria-label="Imagen siguiente"
                      >
                        <ChevronRight className="w-5 h-5" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Indicador de posición */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <div
                        className="badge badge-neutral badge-lg gap-1"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {currentIndex + 1} / {images.length}
                      </div>
                    </div>
                  </div>

                  {/* Dots */}
                  <div
                    className="flex justify-center gap-2 py-4"
                    role="tablist"
                    aria-label="Seleccionar imagen"
                  >
                    {images.map((image: ImageData, index: number) => (
                      <button
                        key={image.id}
                        onClick={() => goToSlide(index)}
                        role="tab"
                        aria-selected={index === currentIndex}
                        aria-label={`Ir a imagen ${index + 1}`}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentIndex
                          ? "bg-primary w-8"
                          : "bg-base-300 hover:bg-primary/50"
                          }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

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