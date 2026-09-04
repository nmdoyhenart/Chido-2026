export const PORCENTAJES_PROPINA = [0, 5, 10, 15, 20] as const;

export type PorcentajePropina = (typeof PORCENTAJES_PROPINA)[number];

export type QrPayload =
  | { tipo: "ingreso"; version: 1 }
  | { tipo: "mesa"; mesaId: string; version: 1 }
  | { tipo: "propina"; porcentaje: PorcentajePropina; version: 1 };

export type PropositoScannerQr = "dni" | QrPayload["tipo"];

export type DatosDni = {
  nombres: string;
  apellidos: string;
  dni: string;
};

export type MesaQr = {
  id: string;
  numero: number;
  cantidad_comensales: number;
  tipo: string;
  disponibilidad: string;
  cliente_id: string | null;
  qr_confirmado_at: string | null;
};
