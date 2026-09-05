import { useState } from "react";
import {
  actualizarDisponibilidadMesa,
  crearMesa,
  obtenerMesas,
} from "../services/mesas";
import type { DisponibilidadMesa, Mesa, NuevaMesa } from "../types/mesa";

export function useMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = async (): Promise<Mesa[]> => {
    setCargando(true);
    try {
      const mesasActualizadas = await obtenerMesas();
      setMesas(mesasActualizadas);
      return mesasActualizadas;
    } finally {
      setCargando(false);
    }
  };

  const agregar = async (datos: NuevaMesa): Promise<Mesa> => {
    const nuevaMesa = await crearMesa(datos);
    setMesas((actuales) => [...actuales, nuevaMesa].sort((a, b) => a.numero - b.numero));
    return nuevaMesa;
  };

  const cambiarDisponibilidad = async (
    mesaId: string,
    disponibilidad: DisponibilidadMesa,
  ): Promise<Mesa> => {
    const mesaActualizada = await actualizarDisponibilidadMesa(mesaId, disponibilidad);
    setMesas((actuales) =>
      actuales.map((mesa) => (mesa.id === mesaId ? mesaActualizada : mesa)),
    );
    return mesaActualizada;
  };

  return { mesas, cargando, recargar, agregar, cambiarDisponibilidad };
}
