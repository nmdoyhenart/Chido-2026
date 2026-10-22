import type { Href } from 'expo-router';
import type { AppRole } from '../types/roles';

export const ENTRADA_APP = '/(app)/home';

// Los roles que tienen una portada integrada ingresan por ENTRADA_APP.
const destinos = {
  dueño: ENTRADA_APP,
  supervisor: ENTRADA_APP,
  mozo: ENTRADA_APP,
  metre: '/metre/home',
  cocinero: ENTRADA_APP,
  cocina: ENTRADA_APP, // Alias local anterior de cocinero.
  cantinero: ENTRADA_APP,
  'cliente registrado': '/cliente/home',
  'cliente anónimo': '/cliente-anonimo/escanear',
} as const satisfies Record<AppRole, Href>;

export function obtenerInicioPorPerfil(perfil: string | null) {
  if (!perfil || !Object.prototype.hasOwnProperty.call(destinos, perfil)) return '/(auth)/login';
  return destinos[perfil as AppRole];
}
