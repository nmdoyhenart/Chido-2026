import type { PorcentajePropina } from "../types/qr";
import { parseQrPayload } from "../utils/qr";
import { registrarPropinaPorQr } from './cuenta.service';

export async function seleccionarPropinaPorQr(
  usuarioId: string,
  pedidoId: string,
  rawQr: string,
): Promise<PorcentajePropina> {
  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== "propina") {
    throw new Error("El código escaneado no corresponde a una propina válida.");
  }

  if (!usuarioId) throw new Error('No se pudo validar tu cuenta de cliente.');
  return registrarPropinaPorQr(pedidoId, rawQr);
}
