import type { Producto } from '../types/producto';
import type { ClientePendiente } from '../services/clientes-pendientes.api';
import type { Mesa } from '../types/mesa';

// Datos ficticios: nunca se consultan solicitudes ni mesas reales en la demostración.
export const clientesDemostracion: ClientePendiente[] = ['Ana', 'Martín', 'Lucía'].map((nombres, i) => ({
  id: `demo-cliente-${i}`, nombres, apellidos: 'Ejemplo', dni: '00000000',
  correo: `cliente${i + 1}@example.com`, foto_perfil: '', fotoUrl: null,
}));

export const mesasDemostracion: Mesa[] = [1, 2, 3].map((numero) => ({
  id: `demo-mesa-${numero}`, numero, cantidad_comensales: 4, tipo: 'estándar',
  disponibilidad: numero === 2 ? 'ocupada' : 'vacía', foto: '', cliente_id: null, qr_confirmado_at: null,
}));

export const productosDemostracion: Producto[] = [
  { id: 'demo-plato', nombre: 'Tacos de demostración', descripcion: 'Producto de ejemplo para recorrer la carta.', precio: 8000, tiempo_elaboracion: 15, fotos: [], tipo: 'plato' },
  { id: 'demo-bebida', nombre: 'Limonada de demostración', descripcion: 'Bebida de ejemplo.', precio: 3000, tiempo_elaboracion: 5, fotos: [], tipo: 'bebida' },
];
