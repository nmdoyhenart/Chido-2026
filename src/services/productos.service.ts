import { supabase } from '../../lib/supabase';
import { Producto } from '../types/producto';

export const getProductos = async (): Promise<Producto[]> => {
  const { data, error } = await supabase.from('productos').select('*');
  if (error) throw error;
  return data || [];
};

