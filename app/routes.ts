import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Rutas de autenticación
  route("auth/register", "routes/auth/register.tsx"),
  route("auth/login", "routes/auth/login.tsx"),
  route("auth/logout", "routes/auth/logout.tsx"),
  route("auth/verify-email", "routes/auth/verify-email.tsx"),
  route("auth/forgot-password", "routes/auth/forgot-password.tsx"),
  route("auth/reset-password", "routes/auth/reset-password.tsx"),

  // MFA
  route("auth/mfa/setup", "routes/auth/mfa/setup.tsx"),
  route("auth/mfa/disable", "routes/auth/mfa/disable.tsx"),

  // Rutas protegidas
  route("dashboard", "routes/dashboard.tsx"),
  route("settings", "routes/settings.tsx"),

  // Otras rutas
  route("hola-mundo", "routes/hola-mundo.tsx"),
  route("calculadora", "routes/calculadora.tsx"),
  route("formulario", "routes/formulario.tsx"),
  route("carrusel", "routes/carrusel.tsx"),
  route("trigger-error", "routes/trigger-error.tsx"),
  route("galeria", "routes/galeria.tsx"),
  route("crud", "routes/crud.tsx"),
] satisfies RouteConfig;