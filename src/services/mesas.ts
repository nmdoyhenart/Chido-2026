import { supabase } from "../../lib/supabase";
import type { MesaQr } from "../types/qr";
import { parseQrPayload } from "../utils/qr";

async function obtenerMesaAsignada(usuarioId: string): Promise<MesaQr | null> {
  const { data, error } = await supabase
    .from("mesas")
    .select(
      "id, numero, cantidad_comensales, tipo, disponibilidad, cliente_id, qr_confirmado_at",
    )
    .eq("cliente_id", usuarioId)
    .maybeSingle();

  if (error) throw new Error("No se pudo verificar la mesa asignada.");

  return (data as MesaQr | null) ?? null;
}

export async function ingresarALaListaDeEspera(
  usuarioId: string,
  rawQr: string,
): Promise<void> {
  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== "ingreso") {
    throw new Error("El código escaneado no corresponde al ingreso al local.");
  }

  const mesa = await obtenerMesaAsignada(usuarioId);
  if (mesa) throw new Error("Ya tenés una mesa asignada.");

  const { error } = await supabase
    .from("lista_espera")
    .insert({ usuario_id: usuarioId });

  if (error?.code === "23505") {
    throw new Error("Ya estás en la lista de espera.");
  }
  if (error) throw new Error("No se pudo registrar el ingreso a la lista de espera.");
}

export async function confirmarMesaPorQr(
  usuarioId: string,
  rawQr: string,
): Promise<MesaQr> {
  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== "mesa") {
    throw new Error("El código escaneado no corresponde a una mesa.");
  }

  const mesa = await obtenerMesaAsignada(usuarioId);
  if (!mesa) {
    throw new Error("Todavía no tenés una mesa asignada.");
  }
  if (mesa.id !== payload.mesaId) {
    throw new Error(
      `Mesa incorrecta. Te asignaron la mesa ${mesa.numero}.`,
    );
  }

  if (mesa.qr_confirmado_at) return mesa;

  const { data, error } = await supabase
    .from("mesas")
    .update({ qr_confirmado_at: new Date().toISOString() })
    .eq("id", mesa.id)
    .eq("cliente_id", usuarioId)
    .is("qr_confirmado_at", null)
    .select(
      "id, numero, cantidad_comensales, tipo, disponibilidad, cliente_id, qr_confirmado_at",
    )
    .maybeSingle();

  if (error) throw new Error("No se pudo confirmar la mesa.");
  if (!data) {
    const mesaActualizada = await obtenerMesaAsignada(usuarioId);
    if (mesaActualizada?.qr_confirmado_at) return mesaActualizada;
    throw new Error("La mesa ya no está disponible para confirmar.");
  }

  return data as MesaQr;
}

export async function obtenerMesaDesdeQr(
  perfil: string,
  rawQr: string,
): Promise<MesaQr> {
  const perfilesAutorizados = ["dueño", "supervisor", "metre", "mozo"];
  if (!perfilesAutorizados.includes(perfil)) {
    throw new Error("Tu perfil no está autorizado para consultar mesas.");
  }

  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== "mesa") {
    throw new Error("El código escaneado no corresponde a una mesa.");
  }

  const { data, error } = await supabase
    .from("mesas")
    .select(
      "id, numero, cantidad_comensales, tipo, disponibilidad, cliente_id, qr_confirmado_at",
    )
    .eq("id", payload.mesaId)
    .maybeSingle();

  if (error || !data) throw new Error("La mesa indicada no existe.");

  return data as MesaQr;
}
