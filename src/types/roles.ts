export type AppRole =
  | 'dueño'
  | 'supervisor'
  | 'metre'
  | 'mozo'
  | 'cocina'
  | 'cocinero'
  | 'cantinero'
  | 'cliente registrado'
  | 'cliente anónimo';

export type SessionMode =
  | 'authenticated'
  | 'guest'
  | 'simulation';
