import { supabase } from "../../lib/supabase";
import type { PorcentajePropina } from "../types/qr";
import { parseQrPayload } from "../utils/qr";

export async function seleccionarPropinaPorQr(
  usuarioId: string,
  pedidoId: string,
  rawQr: string,
): Promise<PorcentajePropina> {
  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== "propina") {
    throw new Error("El código escaneado no corresponde a una propina válida.");
  }

  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("id, cliente_id, estado")
    .eq("id", pedidoId)
    .eq("cliente_id", usuarioId)
    .maybeSingle();

  if (pedidoError || !pedido) {
    throw new Error("No se encontró un pedido activo para seleccionar la propina.");
  }
  if (pedido.estado === "pagado" || pedido.estado === "cancelado") {
    throw new Error("No se puede seleccionar propina para este pedido.");
  }

  const { error } = await supabase
    .from("pedidos")
    .update({ propina_porcentaje: payload.porcentaje })
    .eq("id", pedidoId)
    .eq("cliente_id", usuarioId);

  if (error) throw new Error("No se pudo guardar la propina seleccionada.");

  return payload.porcentaje;
}
