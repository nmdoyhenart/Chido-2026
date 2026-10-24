export const TIPOS_MESA = [
  "VIP",
  "estándar",
  "movilidad reducida",
] as const;

export const DISPONIBILIDADES_MESA = ["vacía", "ocupada"] as const;

export type TipoMesa = (typeof TIPOS_MESA)[number];
export type DisponibilidadMesa = (typeof DISPONIBILIDADES_MESA)[number];

export type Mesa = {
  id: string;
  numero: number;
  cantidad_comensales: number;
  tipo: TipoMesa;
  disponibilidad: DisponibilidadMesa;
  foto: string;
  cliente_id: string | null;
  qr_confirmado_at: string | null;
};

export type NuevaMesa = {
  numero: number;
  cantidadComensales: number;
  tipo: TipoMesa;
  fotoBase64: string;
};

export type ClienteRegistradoSolicitudMesa = {
  id: string;
  nombres: string;
  apellidos: string | null;
  foto_perfil: string;
};
