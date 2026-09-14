import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService, ErrorAcceso } from '../services/auth.service';
import { desvincularDispositivoPush } from '../services/notificaciones-push';
import type { AppRole, SessionMode } from '../types/roles';
import type { Usuario } from '../../shared/acceso';

type EstadoSesion = { mode: SessionMode; role: AppRole | null; usuario: Usuario | null };
type AppSessionContextType = EstadoSesion & {
  cargando: boolean;
  avisoSesion: string | null;
  limpiarAviso: () => void;
  iniciarSesion: (correo: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  enterSimulation: (role: AppRole) => Promise<void>;
  enterGuest: () => Promise<void>;
};
const VACIA: EstadoSesion = { mode: 'guest', role: null, usuario: null };
const AppSessionContext = createContext<AppSessionContextType | undefined>(undefined);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>(VACIA);
  const [cargando, setCargando] = useState(true);
  const [avisoSesion, setAviso] = useState<string | null>(null);
  const activa = useRef(true);
  const revision = useRef(0);
  const ingresando = useRef(false);
  const modoLocal = useRef<EstadoSesion | null>(null);
  const identidadVerificada = useRef<string | null>(null);

  const sincronizar = useCallback(async (session: Session | null) => {
    if (ingresando.current || !activa.current) return;
    const numero = ++revision.current;
    if (!session) {
      identidadVerificada.current = null;
      setEstado(modoLocal.current ?? VACIA);
      setCargando(false);
      return;
    }
    // Al volver de la cámara, una renovación de la misma cuenta no debe
    // desmontar el formulario ni perder los datos que se estaban ingresando.
    if (identidadVerificada.current !== session.user.id) setCargando(true);
    try {
      const usuario = await authService.getProfile();
      if (activa.current && revision.current === numero) {
        modoLocal.current = null;
        identidadVerificada.current = usuario.auth_id;
        setEstado({ mode: 'authenticated', role: usuario.perfil, usuario });
      }
    } catch (error) {
      if (activa.current && revision.current === numero) {
        identidadVerificada.current = null;
        setEstado(VACIA);
        setAviso(error instanceof ErrorAcceso ? error.message : 'No pudimos verificar la sesión. Volvé a ingresar.');
        // No habilitar la aplicación aunque la limpieza falle por falta de conexión.
        await authService.logout().catch(() => undefined);
      }
    } finally {
      if (activa.current && revision.current === numero) setCargando(false);
    }
  }, []);

  useEffect(() => {
    activa.current = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (ingresando.current) return;
      // No llamar a Auth dentro de su callback: su bloqueo todavía puede estar tomado.
      const numero = revision.current;
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (revision.current === numero) void sincronizar(session);
      }, 0);
      timers.add(timer);
    });
    const foreground = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        supabase.auth.startAutoRefresh();
        const numero = revision.current;
        void authService.getSession().then(session => {
          if (revision.current === numero) return sincronizar(session);
        }).catch(() => {
          if (activa.current && revision.current === numero) { identidadVerificada.current = null; setEstado(VACIA); setCargando(false); }
        });
      } else supabase.auth.stopAutoRefresh();
    });
    return () => {
      activa.current = false;
      revision.current++;
      for (const timer of timers) clearTimeout(timer);
      subscription.unsubscribe();
      foreground.remove();
    };
  }, [sincronizar]);

  async function iniciarSesion(correo: string, password: string) {
    if (ingresando.current) throw new ErrorAcceso('Ya hay un ingreso en curso.');
    ingresando.current = true;
    const numero = ++revision.current;
    modoLocal.current = null;
    setAviso(null);
    let autenticada = false;
    try {
      await authService.login(correo, password);
      autenticada = true;
      const usuario = await authService.getProfile();
      if (!activa.current || revision.current !== numero) throw new ErrorAcceso('El ingreso fue interrumpido. Intentá nuevamente.');
      identidadVerificada.current = usuario.auth_id;
      setEstado({ mode: 'authenticated', role: usuario.perfil, usuario });
    } catch (error) {
      if (autenticada) await authService.logout().catch(() => undefined);
      identidadVerificada.current = null;
      if (activa.current) setEstado(VACIA);
      throw error;
    } finally {
      ingresando.current = false;
      if (activa.current) setCargando(false);
    }
  }

  async function cerrarSesion() {
    revision.current++;
    // Evita que el siguiente aviso del dispositivo alcance a la cuenta que cerró sesión.
    await desvincularDispositivoPush().catch(() => undefined);
    await authService.logout();
    identidadVerificada.current = null;
    modoLocal.current = null;
    setEstado(VACIA);
    setAviso(null);
  }

  async function entrarLocal(mode: 'guest' | 'simulation', role: AppRole) {
    revision.current++;
    await authService.logout();
    identidadVerificada.current = null;
    const local: EstadoSesion = { mode, role, usuario: null };
    modoLocal.current = local;
    setEstado(local);
    setAviso(null);
    setCargando(false);
  }

  return <AppSessionContext.Provider value={{
    ...estado, cargando, avisoSesion, limpiarAviso: () => setAviso(null),
    iniciarSesion, cerrarSesion,
    enterSimulation: (role) => entrarLocal('simulation', role),
    enterGuest: () => entrarLocal('guest', 'cliente anónimo'),
  }}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) throw new Error('useAppSession debe usarse dentro de AppSessionProvider.');
  return context;
}
