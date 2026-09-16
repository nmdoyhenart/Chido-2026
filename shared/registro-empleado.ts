export const MAX_FOTO_BYTES = 2 * 1024 * 1024;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 30;
export const MAX_NOMBRE_LENGTH = 15;

const NOMBRE_VALIDO = /^\p{L}[\p{L}\p{M}]*(?:[ '’\-][\p{L}\p{M}]+)*$/u;

export function normalizarNombre(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function validarNombre(value: string): boolean {
  return value.length >= 2 && value.length <= MAX_NOMBRE_LENGTH && NOMBRE_VALIDO.test(value);
}

export function validarDni(value: string): boolean {
  return /^[0-9]{8}$/.test(value) && !/^0+$/.test(value);
}

export function validarCorreo(value: string): boolean {
  if (value.length > 254 || /\s/.test(value)) return false;
  const partes = value.split('@');
  if (partes.length !== 2) return false;
  const [local, dominio] = partes;
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/i.test(local)) return false;
  const etiquetas = dominio.split('.');
  return etiquetas.length >= 2 && etiquetas.every((etiqueta) =>
    etiqueta.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(etiqueta),
  ) && /^[a-z]{2,63}$/i.test(etiquetas.at(-1) ?? '');
}

export function validarFotoBase64(value: string): boolean {
  if (!value || value.length > Math.ceil(MAX_FOTO_BYTES / 3) * 4) return false;
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const bytes = value.length * 3 / 4 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
  return bytes >= 128 && bytes <= MAX_FOTO_BYTES && value.startsWith('/9j/');
}

export type DatosRegistroEmpleado = {
  nombres: string;
  apellidos: string;
  dni: string;
  cuil: string;
  correo: string;
  password: string;
  fotoBase64: string;
  perfil: string;
};

export type CampoRegistroEmpleado = keyof DatosRegistroEmpleado;
export type ErroresRegistroEmpleado = Partial<Record<CampoRegistroEmpleado, string>>;

export function validarCuil(value: string): boolean {
  return /^[0-9]{11}$/.test(value);
}

export function validarRegistroEmpleado(input: unknown): {
  datos: DatosRegistroEmpleado;
  errores: ErroresRegistroEmpleado;
} {
  const objeto = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const texto = (campo: string) => typeof objeto[campo] === 'string' ? objeto[campo] as string : '';
  
  const datos: DatosRegistroEmpleado = {
    nombres: normalizarNombre(texto('nombres')),
    apellidos: normalizarNombre(texto('apellidos')),
    dni: texto('dni').replace(/\D/g, ''),
    cuil: texto('cuil').replace(/\D/g, ''),
    correo: texto('correo').trim().toLowerCase(),
    password: texto('password'),
    fotoBase64: texto('fotoBase64'),
    perfil: texto('perfil') || 'cocinero',
  };
  
  const errores: ErroresRegistroEmpleado = {};
  
  for (const campo of ['nombres', 'apellidos'] as const) {
    const etiqueta = campo === 'nombres' ? 'Los nombres' : 'Los apellidos';
    if (!datos[campo]) errores[campo] = `Ingresá tus ${campo}.`;
    else if (datos[campo].length < 2) errores[campo] = `${etiqueta} deben tener al menos 2 caracteres.`;
    else if (datos[campo].length > MAX_NOMBRE_LENGTH) errores[campo] = `${etiqueta} no pueden superar los ${MAX_NOMBRE_LENGTH} caracteres.`;
    else if (/\p{N}/u.test(datos[campo])) errores[campo] = `${etiqueta} no pueden contener números.`;
    else if (!/^[\p{L}\p{M} '’\-]+$/u.test(datos[campo])) errores[campo] = `${etiqueta} sólo admiten letras, espacios, guiones y apóstrofes.`;
    else if (!validarNombre(datos[campo])) errores[campo] = `${etiqueta} deben comenzar con una letra. Usá espacios, guiones o apóstrofes sólo entre palabras, sin repetirlos.`;
  }
  
  if (!datos.dni) errores.dni = 'Ingresá el DNI del empleado.';
  else if (/[^0-9]/.test(datos.dni)) errores.dni = 'El DNI sólo admite números.';
  else if (datos.dni.length < 8) errores.dni = `Faltan números en el DNI.`;
  else if (datos.dni.length > 8) errores.dni = 'El DNI tiene más de 8 números.';
  else if (!validarDni(datos.dni)) errores.dni = 'El DNI no es válido.';

  if (!datos.cuil) errores.cuil = 'Ingresá el CUIL del empleado.';
  else if (!validarCuil(datos.cuil)) errores.cuil = 'El CUIL debe tener exactamente 11 números sin guiones.';

  if (!validarCorreo(datos.correo)) errores.correo = 'El correo electrónico no tiene un formato válido.';

  const longitudPassword = Array.from(datos.password).length;
  if (!datos.password) errores.password = 'Ingresá una contraseña para el empleado.';
  else if (!datos.password.trim()) errores.password = 'La contraseña no puede estar formada sólo por espacios.';
  else if (longitudPassword < MIN_PASSWORD_LENGTH) errores.password = 'La contraseña debe tener al menos 8 caracteres.';
  else if (longitudPassword > MAX_PASSWORD_LENGTH) errores.password = 'La contraseña no puede superar los 30 caracteres.';
  else if (!/\p{Lu}/u.test(datos.password)) errores.password = 'La contraseña debe contener al menos una letra mayúscula.';

  if (!datos.fotoBase64) errores.fotoBase64 = 'Falta la foto personal.';
  else if (!validarFotoBase64(datos.fotoBase64)) errores.fotoBase64 = 'La foto tiene un formato inválido o es muy pesada.';

  const perfilesValidos = ['supervisor', 'metre', 'mozo', 'cocinero', 'cantinero'];
  if (!perfilesValidos.includes(datos.perfil)) errores.perfil = 'El perfil seleccionado no es válido.';

  return { datos, errores };
}
