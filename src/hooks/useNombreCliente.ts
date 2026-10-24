import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSession } from '../contexts/AppSessionContext';

export function useNombreCliente(fallbackAnonimoId?: string): { nombreCliente: string; fotoCliente: string | null } {
  const { usuario } = useAppSession();
  const [nombreAnonimo, setNombreAnonimo] = useState<string | null>(null);
  const [fotoAnonimo, setFotoAnonimo] = useState<string | null>(null);

  useEffect(() => {
    if (usuario) return;

    let activo = true;
    void (async () => {
      try {
        const items = await AsyncStorage.multiGet([
          'cliente_anonimo_nombre',
          'cliente_anonimo_foto_url',
          'cliente_anonimo_id',
        ]);
        if (!activo) return;
        const map = Object.fromEntries(items);
        if (map.cliente_anonimo_nombre) {
          setNombreAnonimo(map.cliente_anonimo_nombre);
        }
        if (map.cliente_anonimo_foto_url) {
          setFotoAnonimo(map.cliente_anonimo_foto_url);
        }

        const idAnonimo = fallbackAnonimoId || map.cliente_anonimo_id;
        if (!map.cliente_anonimo_nombre && idAnonimo) {
          const { obtenerClienteEnListaPorId } = await import('../../lib/clientesAnonimos');
          const cliente = await obtenerClienteEnListaPorId(idAnonimo);
          if (activo && cliente) {
            if (cliente.nombre) setNombreAnonimo(cliente.nombre);
            if (cliente.foto_url) setFotoAnonimo(cliente.foto_url);
          }
        }
      } catch {
        // Fallback silencioso
      }
    })();

    return () => {
      activo = false;
    };
  }, [usuario, fallbackAnonimoId]);

  const nombreCompleto = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || usuario?.nombres;
  const nombreCliente = usuario
    ? (nombreCompleto || 'Cliente')
    : (nombreAnonimo || 'Cliente');

  const fotoCliente =
    (usuario?.fotoUrl ??
      (usuario?.foto_perfil && /^https:\/\//i.test(usuario.foto_perfil)
        ? usuario.foto_perfil
        : null)) ?? fotoAnonimo;

  return { nombreCliente, fotoCliente };
}

