// app/routes/trigger-error.tsx
import type { Route } from "./+types/home";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Error de Prueba | Mi App" },
  ];
}

export default function TriggerError() {
  // Esto dispara un error intencional
  throw new Error("¡Este es un error de prueba generado intencionalmente!");
}