export const PERFILES = ['dueño', 'supervisor', 'metre', 'mozo', 'cocinero', 'cantinero', 'cliente registrado', 'cliente anónimo'] as const;
export type Perfil = typeof PERFILES[number];
export type Usuario = {
  id: string;
  auth_id: string;
  nombres: string;
  apellidos: string | null;
  perfil: Perfil;
  estado_registro: 'pendiente' | 'aceptado' | 'rechazado' | null;
  foto_perfil: string;
  fotoUrl?: string | null;
};

export function motivoAccesoDenegado(usuario: Usuario | null, authId: string): string | null {
  if (!usuario || !usuario.id || usuario.auth_id !== authId || !PERFILES.includes(usuario.perfil)) {
    return 'La cuenta no tiene un perfil válido vinculado. Consultá con el restaurante.';
  }
  if (usuario.perfil === 'cliente anónimo') return null;
  if (usuario.estado_registro === 'pendiente') return 'Tu registro está pendiente de aprobación del dueño o supervisor.';
  if (usuario.estado_registro === 'rechazado') return 'Tu registro fue rechazado. Consultá con el restaurante si necesitás más información.';
  if (usuario.estado_registro !== 'aceptado') return 'La cuenta no está habilitada para ingresar.';
  return null;
}

export function mensajeErrorAuth(error: unknown): string {
  const objeto = error && typeof error === 'object' ? error as { code?: string; message?: string } : {};
  const texto = typeof objeto.message === 'string' ? objeto.message : '';
  if (texto.includes('CHIDO_PENDIENTE')) return 'Tu registro está pendiente de aprobación del dueño o supervisor.';
  if (texto.includes('CHIDO_RECHAZADO')) return 'Tu registro fue rechazado. Consultá con el restaurante.';
  if (texto.includes('CHIDO_SIN_PERFIL')) return 'La cuenta no tiene un perfil habilitado. Consultá con el restaurante.';
  if (objeto.code === 'invalid_credentials' || /invalid login credentials/i.test(texto)) return 'Correo electrónico o contraseña incorrectos.';
  if (objeto.code === 'email_not_confirmed') return 'El correo de esta cuenta todavía no fue confirmado.';
  if (objeto.code === 'over_request_rate_limit') return 'Hubo demasiados intentos. Esperá unos minutos antes de volver a ingresar.';
  return 'No pudimos iniciar sesión. Revisá la conexión e intentá nuevamente.';
}
