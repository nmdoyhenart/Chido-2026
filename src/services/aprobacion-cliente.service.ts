import { supabase } from '../lib/supabase';
import { crearApiAprobaciones } from './clientes-pendientes.api';

export { TAMANO_PAGINA, type ClientePendiente } from './clientes-pendientes.api';
export const { listarPendientes, contarPendientes, resolverCliente } = crearApiAprobaciones(supabase);
