// app/components/Breadcrumb.tsx
import { Link, useLocation } from "react-router";
import { Home, ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Mapa de rutas a nombres legibles
const routeNames: Record<string, string> = {
  "": "Inicio",
  "calculadora": "Calculadora",
  "formulario": "Formulario",
  "carrusel": "Carrusel",
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Navegación de migas de pan" className="mb-6">
      <div className="breadcrumbs text-sm bg-base-100/50 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm">
        <ul>
          {/* Inicio siempre presente */}
          <li>
            <Link 
              to="/" 
              className="flex items-center gap-1 hover:text-primary transition-colors"
              aria-label="Ir al inicio"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              <span>Inicio</span>
            </Link>
          </li>
          
          {/* Items dinámicos */}
          {items.map((item, index) => (
            <li key={index}>
              {item.href ? (
                <Link 
                  to={item.href}
                  className="hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-primary font-medium" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

// Hook para generar breadcrumbs automáticamente
export function useAutoBreadcrumb(): BreadcrumbItem[] {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  
  return pathSegments.map((segment, index) => {
    const isLast = index === pathSegments.length - 1;
    const href = isLast ? undefined : "/" + pathSegments.slice(0, index + 1).join("/");
    
    return {
      label: routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href,
    };
  });
}