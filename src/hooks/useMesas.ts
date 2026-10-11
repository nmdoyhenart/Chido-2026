import { useAppSession } from '../contexts/AppSessionContext';
import { mesasDemostracion } from '../data/demostracion';
import { useCallback, useEffect, useRef, useState } from "react";
import {
  crearMesa,
  liberarMesa,
  obtenerMesas,
} from "../services/mesas";
import type { Mesa, NuevaMesa } from "../types/mesa";

export function useMesas() {
  const { mode } = useAppSession();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);
  const activa = useRef(true);
  const pendiente = useRef<Promise<Mesa[]> | null>(null);
  const consulta = useRef<AbortController | null>(null);

  useEffect(() => {
    activa.current = true;
    return () => {
      activa.current = false;
      consulta.current?.abort();
    };
  }, []);

  const recargar = useCallback((forzar = false): Promise<Mesa[]> => {
    if (mode === 'simulation') { setCargando(false); return Promise.resolve(mesasDemostracion); }
    if (pendiente.current && !forzar) return pendiente.current;
    consulta.current?.abort();
    setCargando(true);
    const controller = new AbortController();
    consulta.current = controller;
    let timer: ReturnType<typeof setTimeout>;
    const limite = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error("La consulta tardó demasiado. Revisá la conexión y actualizá el listado."));
        controller.abort();
      }, 15000);
    });
    // El límite también cubre esperas del cliente de sesión previas al fetch.
    pendiente.current = Promise.race([obtenerMesas(controller.signal), limite])
      .then((resultado) => {
        if (activa.current && !controller.signal.aborted) setMesas(resultado);
        return resultado;
      })
      .finally(() => {
        clearTimeout(timer);
        if (consulta.current === controller) {
          pendiente.current = null;
          if (activa.current) setCargando(false);
        }
      });
    return pendiente.current;
  }, [mode]);

  const agregar = async (datos: NuevaMesa): Promise<Mesa> => {
    if (mode !== 'authenticated') throw new Error('Se requiere una cuenta autorizada.');
    const nuevaMesa = await crearMesa(datos);
    if (activa.current) setMesas((actuales) => [...actuales, nuevaMesa].sort((a, b) => a.numero - b.numero));
    return nuevaMesa;
  };

  const liberar = async (mesaId: string): Promise<Mesa> => {
    if (mode !== 'authenticated') throw new Error('Se requiere una cuenta autorizada.');
    const mesaActualizada = await liberarMesa(mesaId);
    if (activa.current) setMesas((actuales) =>
      actuales.map((mesa) => (mesa.id === mesaId ? mesaActualizada : mesa)),
    );
    return mesaActualizada;
  };

  return { mesas: mode === 'simulation' ? mesasDemostracion : mesas, cargando, recargar, agregar, liberar };
}
