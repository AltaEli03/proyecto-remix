// app/routes/carrusel.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  Images, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Breadcrumb } from "~/components/Breadcrumb";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Carrusel de Imágenes | Mi App" },
    { name: "description", content: "Galería de imágenes usando Lorem Picsum" },
  ];
}

interface ImageData {
  id: number;
  url: string;
  alt: string;
}

export default function Carrusel() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateImages = () => {
    setIsLoading(true);
    setError(null);
    
    // Generar 5 imágenes aleatorias de Lorem Picsum
    const newImages: ImageData[] = [];
    const usedIds = new Set<number>();
    
    while (newImages.length < 5) {
      // Lorem Picsum tiene imágenes del 1 al 1084
      const randomId = Math.floor(Math.random() * 1000) + 1;
      
      if (!usedIds.has(randomId)) {
        usedIds.add(randomId);
        newImages.push({
          id: randomId,
          url: `https://picsum.photos/id/${randomId}/800/400`,
          alt: `Imagen aleatoria ${randomId} de Lorem Picsum`,
        });
      }
    }
    
    setImages(newImages);
    setCurrentIndex(0);
    
    // Simular carga
    setTimeout(() => setIsLoading(false), 500);
  };

  useEffect(() => {
    generateImages();
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-play (opcional)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading && images.length > 0) {
        goToNext();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoading, images.length, currentIndex]);

  return (
    <main className="min-h-screen bg-base-200 p-4">
      <div className="container mx-auto max-w-4xl">
        <Breadcrumb items={[{ label: "Carrusel" }]} />

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
                onClick={generateImages}
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
              ) : error ? (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              ) : (
                <>
                  {/* Imagen principal */}
                  <div className="relative">
                    <div className="carousel w-full">
                      {images.map((image, index) => (
                        <div
                          key={image.id}
                          className={`carousel-item w-full transition-opacity duration-500 ${
                            index === currentIndex ? "block" : "hidden"
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
                            onError={(e) => {
                              // Fallback si la imagen falla
                              (e.target as HTMLImageElement).src = 
                                `https://picsum.photos/800/400?random=${image.id}`;
                            }}
                          />
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

                  {/* Thumbnails / Dots */}
                  <div 
                    className="flex justify-center gap-2 py-4"
                    role="tablist"
                    aria-label="Seleccionar imagen"
                  >
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => goToSlide(index)}
                        role="tab"
                        aria-selected={index === currentIndex}
                        aria-label={`Ir a imagen ${index + 1}`}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          index === currentIndex
                            ? "bg-primary w-8"
                            : "bg-base-300 hover:bg-primary/50"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Grid de miniaturas */}
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {images.map((image, index) => (
                      <button
                        key={`thumb-${image.id}`}
                        onClick={() => goToSlide(index)}
                        className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
                          index === currentIndex
                            ? "ring-2 ring-primary ring-offset-2"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        aria-label={`Seleccionar imagen ${index + 1}`}
                      >
                        <img
                          src={`https://picsum.photos/id/${image.id}/100/60`}
                          alt=""
                          className="w-full h-12 md:h-16 object-cover"
                          loading="lazy"
                        />
                      </button>
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