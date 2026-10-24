import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { clientesDemostracion } from '../data/demostracion';
import { contarPendientes } from '../services/aprobacion-cliente.service';
import { useVibrarError } from './useVibrarError';

export function useContadorPendientes(simulacion = false) {
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useVibrarError(error);
  useFocusEffect(useCallback(() => {
    if (simulacion) return;
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
  }, [simulacion]));
  return { total: simulacion ? clientesDemostracion.length : total, error: simulacion ? null : error };
}
