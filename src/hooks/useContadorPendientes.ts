import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { contarPendientes } from '../services/aprobacion-cliente.service';

export function useContadorPendientes() {
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let activo = true;
    let consultando = false;
    async function actualizar() {
      if (!activo || consultando || AppState.currentState === 'background') return;
      consultando = true;
      try {
        const cantidad = await contarPendientes();
        if (activo) { setTotal(cantidad); setError(null); }
      } catch {
        if (activo) { setTotal(null); setError('No pudimos actualizar las solicitudes. Tocá la tarjeta para reintentar.'); }
      } finally { consultando = false; }
    }
    void actualizar();
    const intervalo = setInterval(() => { void actualizar(); }, 10000);
    const cambios = AppState.addEventListener('change', estado => { if (estado === 'active') void actualizar(); });
    return () => { activo = false; clearInterval(intervalo); cambios.remove(); };
  }, []));
  return { total, error };
}
