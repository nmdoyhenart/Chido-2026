import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { crearClienteRegistroPublico } from './registro-publico';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan claves en .env'
  );
}

export const supabaseRegistroPublico = crearClienteRegistroPublico(supabaseUrl, supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: {
        getItem: (key) => Platform.OS === 'web' && typeof window === 'undefined' ? Promise.resolve(null) : AsyncStorage.getItem(key),
        setItem: (key, value) => Platform.OS === 'web' && typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.setItem(key, value),
        removeItem: (key) => Platform.OS === 'web' && typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.removeItem(key),
      },

      // Mantiene la sesión guardada al cerrar la app
      persistSession: true,

      // Supabase renueva automáticamente la sesión
      autoRefreshToken: true,

      // En React Native no usamos el flujo URL del navegador
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (input, init) => {
        const controller = new AbortController();
        const abortar = () => controller.abort();
        const origen = init?.signal;
        if (origen?.aborted) controller.abort();
        else origen?.addEventListener('abort', abortar, { once: true });
        const limite = setTimeout(abortar, 45000);
        try { return await fetch(input, { ...init, signal: controller.signal }); }
        finally { clearTimeout(limite); origen?.removeEventListener('abort', abortar); }
      },
    },
  }
);
