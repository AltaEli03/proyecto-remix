import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("hola-mundo", "routes/hola-mundo.tsx"),
  route("calculadora", "routes/calculadora.tsx"),
  route("formulario", "routes/formulario.tsx"),
  route("carrusel", "routes/carrusel.tsx"),
  route("trigger-error", "routes/trigger-error.tsx"),
  route("galeria", "routes/galeria.tsx"),
  route("dom-manipulation", "routes/dom-manipulation.tsx"),
] satisfies RouteConfig;