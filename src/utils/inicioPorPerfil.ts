import type { Href } from 'expo-router';
import type { AppRole } from '../types/roles';

export const ENTRADA_APP = '/(app)/home';

// Ambos ingresos pasan por ENTRADA_APP. Agregar aquí las pantallas de inicio
// de cocina/bar cuando estén integradas; por ahora se usan sus altas existentes.
const destinos = {
  dueño: ENTRADA_APP,
  supervisor: ENTRADA_APP,
  mozo: ENTRADA_APP,
  metre: '/metre/home',
  cocinero: '/productos/alta',
  cocina: '/productos/alta', // Alias local anterior de cocinero.
  cantinero: '/productos/alta-bebida',
  'cliente registrado': '/cliente/home',
  'cliente anónimo': '/cliente-anonimo/escanear',
} as const satisfies Record<AppRole, Href>;

export function obtenerInicioPorPerfil(perfil: string | null) {
  if (!perfil || !Object.prototype.hasOwnProperty.call(destinos, perfil)) return '/(auth)/login';
  return destinos[perfil as AppRole];
}
