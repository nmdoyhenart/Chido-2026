import { leerDni } from '../../shared/registro-cliente';
import {
  PORCENTAJES_PROPINA,
  type DatosDni,
  type PorcentajePropina,
  type QrPayload,
} from "../types/qr";

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const MESA_QR_PATTERN = new RegExp(
  `^chido:mesa:(${UUID_PATTERN}):v1$`,
  "i",
);
const PROPINA_QR_PATTERN = /^chido:propina:(0|5|10|15|20):v1$/i;

export function createIngresoQr(): string {
  return "chido:ingreso:v1";
}

export function createMesaQr(mesaId: string): string {
  if (!new RegExp(`^${UUID_PATTERN}$`, "i").test(mesaId)) {
    throw new Error("El identificador de mesa no tiene un formato válido.");
  }

  return `chido:mesa:${mesaId.toLowerCase()}:v1`;
}

export function createPropinaQr(porcentaje: PorcentajePropina): string {
  return `chido:propina:${porcentaje}:v1`;
}

export function parseQrPayload(raw: string): QrPayload | null {
  const value = raw.trim();

  // QR de ingreso definido actualmente y valor legado que ya usa el flujo anónimo.
  if (/^(?:chido:ingreso:v1|ENTRADA_LOCAL)$/i.test(value)) {
    return { tipo: "ingreso", version: 1 };
  }

  const mesaMatch = value.match(MESA_QR_PATTERN);
  if (mesaMatch) {
    return { tipo: "mesa", mesaId: mesaMatch[1].toLowerCase(), version: 1 };
  }

  const propinaMatch = value.match(PROPINA_QR_PATTERN);
  if (propinaMatch) {
    const porcentaje = Number(propinaMatch[1]) as PorcentajePropina;
    if (PORCENTAJES_PROPINA.includes(porcentaje)) {
      return { tipo: "propina", porcentaje, version: 1 };
    }
  }

  return null;
}

// Alias de compatibilidad: todos los lectores usan la validación del registro.
export function parseDniPdf417(raw: string): DatosDni | null {
  return leerDni(raw);
}
