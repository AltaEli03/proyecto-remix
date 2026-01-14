import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("hola-mundo", "routes/hola-mundo.tsx"),
] satisfies RouteConfig;
