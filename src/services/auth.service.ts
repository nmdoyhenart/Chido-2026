import { supabase } from '../lib/supabase';
import { motivoAccesoDenegado, mensajeErrorAuth, type Usuario } from '../../shared/acceso';

export class ErrorAcceso extends Error {}

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new ErrorAcceso(mensajeErrorAuth(error));
    return data;
  },

  async getProfile(): Promise<Usuario> {
    const { data: identidad, error: identidadError } = await supabase.auth.getUser();
    if (identidadError || !identidad.user) throw new ErrorAcceso('La sesión venció. Volvé a ingresar.');
    const { data, error } = await supabase.from('usuarios')
      .select('id, auth_id, nombres, apellidos, perfil, estado_registro, foto_perfil')
      .eq('auth_id', identidad.user.id).maybeSingle();
    if (error) throw new ErrorAcceso('No pudimos verificar tu perfil. Revisá la conexión e intentá nuevamente.');
    const motivo = motivoAccesoDenegado(data as Usuario | null, identidad.user.id);
    if (motivo) throw new ErrorAcceso(motivo);
    const usuario = data as Usuario;
    const fotoPerfil = usuario.foto_perfil.trim();
    if (!fotoPerfil) return usuario;
    if (/^https:\/\//i.test(fotoPerfil)) return { ...usuario, fotoUrl: fotoPerfil };

    const { data: foto, error: fotoError } = await supabase.storage
      .from('perfiles')
      .createSignedUrl(fotoPerfil, 3600);
    if (fotoError) {
      console.warn('No se pudo preparar la foto de perfil.', fotoError.message);
      return usuario;
    }
    return { ...usuario, fotoUrl: foto?.signedUrl ?? null };
  },

  async logout() {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new ErrorAcceso('No pudimos cerrar la sesión. Revisá la conexión e intentá nuevamente.');
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new ErrorAcceso('No pudimos recuperar la sesión.');
    return data.session;
  },
};
