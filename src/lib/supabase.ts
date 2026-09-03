import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan claves en .env'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,

      // Mantiene la sesión guardada al cerrar la app
      persistSession: true,

      // Supabase renueva automáticamente la sesión
      autoRefreshToken: true,

      // En React Native no usamos el flujo URL del navegador
      detectSessionInUrl: false,
    },
  }
);