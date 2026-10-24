import type { AppRole } from "../types/roles";

export function puedeAdministrarMesas(rol: AppRole | null): boolean {
  return rol === "dueño" || rol === "supervisor";
}

export function puedeDarAltaEmpleado(rol: AppRole | null): boolean {
  return rol === "dueño" || rol === "supervisor";
}

export function puedeDarAltaProducto(rol: AppRole | null): boolean {
  return rol === "cocinero" || rol === "cantinero";
}
