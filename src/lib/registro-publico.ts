import { createClient } from '@supabase/supabase-js';

// El autorregistro no lee ni renueva sesiones guardadas. La clave pública
// identifica el proyecto; no debe interpretarse como el JWT de una persona.
export function crearClienteRegistroPublico(url: string, clavePublica: string, transporte: typeof fetch = fetch) {
  return createClient(url, clavePublica, {
    accessToken: async () => null,
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.delete('Authorization');
        return transporte(input, { ...init, headers });
      },
    },
  });
}
