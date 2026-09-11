import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';

export type EmpleadoFormData = {
  nombres: string;
  apellidos: string;
  dni: string;
  cuil: string;
  correo: string;
  perfil: string;
  foto: string | null;
  contraseña?: string;
};

export async function subirFotoPerfil(uri: string, dni: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const arrayBuffer = decode(base64);

  const nombreArchivo = `perfil-${dni}-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('foto_personal')
    .upload(nombreArchivo, arrayBuffer, { contentType: 'image/jpeg' });

  if (error) {
    console.error('Error al subir la foto de perfil:', error.message);
    throw new Error('Error al subir foto (Verifica los permisos/RLS del Bucket "foto_personal"): ' + error.message);
  }

  const { data } = supabase.storage.from('foto_personal').getPublicUrl(nombreArchivo);
  return data.publicUrl;
}

export async function crearEmpleado(formData: EmpleadoFormData) {
  const { data: existingUser } = await supabase
    .from('usuarios')
    .select('id')
    .eq('correo', formData.correo)
    .maybeSingle();

  if (existingUser) {
    throw new Error('El correo electrónico ya se encuentra registrado en otro empleado.');
  }

  let fotoUrl = '';
  if (formData.foto) {
    fotoUrl = await subirFotoPerfil(formData.foto, formData.dni);
  } else {
    throw new Error('La foto es obligatoria');
  }

  let contraseña_hash = '';
  if (formData.contraseña) {
    contraseña_hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      formData.contraseña
    );
  }

  const insertData: any = {
    nombres: formData.nombres,
    apellidos: formData.apellidos,
    dni: formData.dni,
    cuil: formData.cuil,
    correo: formData.correo,
    perfil: formData.perfil,
    foto_perfil: fotoUrl,
  };

  const { error } = await supabase.from('usuarios').insert(insertData);

  if (error) {
    console.error('Error al insertar usuario:', error);
    if (error.code === '23505') {
      throw new Error('El correo, DNI o CUIL ya se encuentra registrado.');
    }
    throw new Error('Error al guardar datos (Verifica los permisos/RLS de la tabla "usuarios"): ' + error.message);
  }
}
