export type MarcaTateti = 'X' | 'O' | null;
export type TableroTateti = [MarcaTateti, MarcaTateti, MarcaTateti, MarcaTateti, MarcaTateti, MarcaTateti, MarcaTateti, MarcaTateti, MarcaTateti];
export type EstadoJuego = 'en_curso' | 'ganado' | 'perdido' | 'empate';
export type CartaMemotest = 'taco' | 'chile' | 'sombrero' | 'cupon';
export type EstadoRondaTateti = 'en_curso' | 'cliente' | 'aplicacion' | 'empate';
export type PalabraAhorcado = { palabra: string; categoria: string };

export type PartidaTateti = {
  tablero: TableroTateti;
  turno: 'cliente' | 'aplicacion';
  ronda: number;
  puntosCliente: number;
  puntosAplicacion: number;
  estadoRonda: EstadoRondaTateti;
};

export type IntentoJuego = {
  id: string;
  pedido_id: string;
  juego: 'ta_te_ti' | 'memotest' | 'ahorcado';
  estado: EstadoJuego;
  partida: PartidaTateti;
  descuento_otorgado: number;
};

export type EstadoMemotest = {
  estado: EstadoJuego;
  cartas: (CartaMemotest | null)[];
  emparejadas: number[];
  intentos: number;
  descuento_otorgado: number;
  ocultar: boolean;
};

export type EstadoAhorcado = {
  estado: EstadoJuego;
  palabra: (string | null)[];
  palabra_resuelta: string | null;
  categoria: string;
  letras_intentadas: string[];
  errores: number;
  max_errores: number;
  descuento_otorgado: number;
};
