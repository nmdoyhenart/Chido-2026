import { supabase } from '../lib/supabase';
import { crearServicioEmpleados } from './empleados.api';

export const crearEmpleado = crearServicioEmpleados(supabase);
