export type AppRole =
    | 'cliente'
    | 'empleado'
    | 'cocina'
    | 'encargado'
    | 'administrador';

export type SessionMode =
    | 'authenticated'
    | 'guest'
    | 'simulation';