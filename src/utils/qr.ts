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

function limpiarNombre(value: string | undefined): string {
  return (value ?? "")
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function esDniValido(value: string | undefined): value is string {
  return /^\d{7,8}$/.test(value ?? "");
}

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

  if (/^chido:ingreso:v1$/i.test(value)) {
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

export function parseDniPdf417(raw: string): DatosDni | null {
  const fields = raw.split("@").map((field) => field.trim());

  const formatoEstandar = {
    apellidos: limpiarNombre(fields[1]),
    nombres: limpiarNombre(fields[2]),
    dni: fields[4] ?? "",
  };

  if (
    formatoEstandar.apellidos &&
    formatoEstandar.nombres &&
    esDniValido(formatoEstandar.dni)
  ) {
    return formatoEstandar;
  }

  const formatoAlternativo = {
    apellidos: limpiarNombre(fields[4]),
    nombres: limpiarNombre(fields[5]),
    dni: fields[1] ?? "",
  };

  if (
    formatoAlternativo.apellidos &&
    formatoAlternativo.nombres &&
    esDniValido(formatoAlternativo.dni)
  ) {
    return formatoAlternativo;
  }

  return null;
}
