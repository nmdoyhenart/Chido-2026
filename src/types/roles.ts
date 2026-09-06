export type AppRole =
  | 'dueño'
  | 'supervisor'
  | 'metre'
  | 'mozo'
  | 'cocinero'
  | 'cantinero'
  | 'cliente registrado'
  | 'cliente anónimo';

export type SessionMode =
  | 'authenticated'
  | 'guest'
  | 'simulation';
