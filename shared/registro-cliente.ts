// Reglas compartidas entre la aplicación y el servidor. No dependen de React Native.
export const MAX_FOTO_BYTES = 2 * 1024 * 1024;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 30;
export const MAX_NOMBRE_LENGTH = 15;

export type DatosRegistroCliente = {
  nombres: string;
  apellidos: string;
  dni: string;
  correo: string;
  password: string;
  fotoBase64: string;
};

export type CampoRegistro = keyof DatosRegistroCliente | 'confirmarPassword';
export type ErroresRegistro = Partial<Record<CampoRegistro, string>>;
export type DatosDni = Pick<DatosRegistroCliente, 'nombres' | 'apellidos' | 'dni'>;

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

export function bytesUtf8(value: string): number {
  return Array.from(value).reduce((total, caracter) => {
    const codigo = caracter.codePointAt(0)!;
    return total + (codigo <= 0x7f ? 1 : codigo <= 0x7ff ? 2 : codigo <= 0xffff ? 3 : 4);
  }, 0);
}

export function validarFotoBase64(value: string): boolean {
  if (!value || value.length > Math.ceil(MAX_FOTO_BYTES / 3) * 4) return false;
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const bytes = value.length * 3 / 4 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
  // Una firma JPEG es un control de formato; el servidor debe comprobar también el archivo.
  return bytes >= 128 && bytes <= MAX_FOTO_BYTES && value.startsWith('/9j/');
}

export function validarRegistroCliente(input: unknown): {
  datos: DatosRegistroCliente;
  errores: ErroresRegistro;
} {
  const objeto = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const texto = (campo: string) => typeof objeto[campo] === 'string' ? objeto[campo] as string : '';
  const datos: DatosRegistroCliente = {
    nombres: normalizarNombre(texto('nombres')),
    apellidos: normalizarNombre(texto('apellidos')),
    dni: texto('dni'),
    correo: texto('correo').trim().toLowerCase(),
    password: texto('password'), // La contraseña nunca se recorta ni se normaliza.
    fotoBase64: texto('fotoBase64'),
  };
  const errores: ErroresRegistro = {};
  for (const campo of ['nombres', 'apellidos'] as const) {
    const etiqueta = campo === 'nombres' ? 'Los nombres' : 'Los apellidos';
    if (!datos[campo]) errores[campo] = `Ingresá tus ${campo}.`;
    else if (datos[campo].length < 2) errores[campo] = `${etiqueta} deben tener al menos 2 caracteres.`;
    else if (datos[campo].length > MAX_NOMBRE_LENGTH) errores[campo] = `${etiqueta} no pueden superar los ${MAX_NOMBRE_LENGTH} caracteres.`;
    else if (/\p{N}/u.test(datos[campo])) errores[campo] = `${etiqueta} no pueden contener números.`;
    else if (!/^[\p{L}\p{M} '’\-]+$/u.test(datos[campo])) errores[campo] = `${etiqueta} sólo admiten letras, espacios, guiones y apóstrofes.`;
    else if (!validarNombre(datos[campo])) errores[campo] = `${etiqueta} deben comenzar con una letra. Usá espacios, guiones o apóstrofes sólo entre palabras, sin repetirlos.`;
  }
  if (!datos.dni) errores.dni = 'Ingresá el DNI del cliente.';
  else if (/[^0-9]/.test(datos.dni)) errores.dni = 'El DNI sólo admite números del 0 al 9, sin letras, símbolos ni espacios.';
  else if (datos.dni.length < 8) errores.dni = `Al DNI le faltan ${8 - datos.dni.length} números: debe tener exactamente 8.`;
  else if (datos.dni.length > 8) errores.dni = 'El DNI tiene más de 8 números. Revisá el documento.';
  else if (!validarDni(datos.dni)) errores.dni = 'El DNI no puede ser 00000000. Ingresá el número del documento.';
  if (!validarCorreo(datos.correo)) {
    const [nombreCorreo, dominio] = datos.correo.split('@');
    if (!datos.correo) errores.correo = 'Ingresá el correo electrónico del cliente.';
    else if (/\s/.test(datos.correo)) errores.correo = 'El correo no puede contener espacios.';
    else if (datos.correo.length > 254) errores.correo = 'El correo no puede superar los 254 caracteres.';
    else if (!datos.correo.includes('@')) errores.correo = 'Al correo le falta @. Ejemplo: nombre@ejemplo.com.';
    else if (datos.correo.split('@').length !== 2) errores.correo = 'El correo debe contener una sola @.';
    else if (!nombreCorreo) errores.correo = 'Escribí la parte del correo que va antes de @.';
    else if (!dominio) errores.correo = 'Escribí el dominio después de @. Ejemplo: gmail.com.';
    else if (nombreCorreo.length > 64) errores.correo = 'La parte del correo anterior a @ no puede superar los 64 caracteres.';
    else if (nombreCorreo.startsWith('.') || nombreCorreo.endsWith('.') || nombreCorreo.includes('..')) errores.correo = 'Antes de @, no uses puntos seguidos ni un punto al principio o al final.';
    else if (!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/i.test(nombreCorreo)) errores.correo = 'La parte anterior a @ contiene caracteres no admitidos. Revisá cómo está escrita tu dirección.';
    else errores.correo = 'Revisá el dominio después de @: debe tener un formato como gmail.com, sin puntos seguidos ni guiones al inicio o al final de cada parte.';
  }
  const longitudPassword = Array.from(datos.password).length;
  if (!datos.password) {
    errores.password = 'Ingresá una contraseña para el cliente.';
  } else if (!datos.password.trim()) {
    errores.password = 'La contraseña no puede estar formada sólo por espacios.';
  } else if (longitudPassword < MIN_PASSWORD_LENGTH) {
    errores.password = 'La contraseña es demasiado corta: debe tener al menos 8 caracteres.';
  } else if (longitudPassword > MAX_PASSWORD_LENGTH) {
    errores.password = 'La contraseña no puede superar los 30 caracteres.';
  } else if (/[\u0000-\u001f\u007f]/u.test(datos.password)) {
    errores.password = 'La contraseña contiene saltos de línea o caracteres invisibles no permitidos. Volvé a escribirla.';
  } else if (!/\p{Lu}/u.test(datos.password)) {
    errores.password = 'La contraseña debe contener al menos una letra mayúscula.';
  } else if (bytesUtf8(datos.password) > 72) {
    errores.password = 'La contraseña ocupa demasiado espacio por sus caracteres especiales. Usá menos emojis o símbolos.';
  }
  if (!datos.fotoBase64) errores.fotoBase64 = 'Falta la foto personal. Tocá «Tomar foto» para agregarla.';
  else if (datos.fotoBase64.length > Math.ceil(MAX_FOTO_BYTES / 3) * 4) errores.fotoBase64 = 'La foto supera los 2 MB. Volvé a tomarla para reducir su tamaño.';
  else if (!validarFotoBase64(datos.fotoBase64)) errores.fotoBase64 = 'La foto está dañada o tiene un formato no admitido. Volvé a tomarla con la cámara.';
  const etiquetas: Record<keyof DatosRegistroCliente, string> = { nombres: 'nombres', apellidos: 'apellidos', dni: 'DNI', correo: 'correo electrónico', password: 'contraseña', fotoBase64: 'foto personal' };
  for (const campo of Object.keys(datos) as (keyof DatosRegistroCliente)[]) {
    if (objeto[campo] != null && typeof objeto[campo] !== 'string') errores[campo] = `El campo ${etiquetas[campo]} llegó con un tipo de dato incorrecto. Volvé a completarlo.`;
  }
  return { datos, errores };
}

export function validarConfirmacion(password: string, confirmarPassword: string): string | undefined {
  if (!confirmarPassword) return 'Repetí tu contraseña.';
  if (password !== confirmarPassword) return 'Las contraseñas no coinciden.';
}

export function leerDni(raw: string): DatosDni | null {
  if (raw.length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(raw)) return null;
  const campos = raw.trim().split('@').map((campo) => campo.trim());
  // Formato del DNI argentino: trámite@apellidos@nombres@sexo@DNI@ejemplar@fechas…
  if (campos.length < 8 || !/^\d+$/.test(campos[0]) || !/^[MFX]$/i.test(campos[3])) return null;
  const datos = {
    apellidos: normalizarNombre(campos[1]),
    nombres: normalizarNombre(campos[2]),
    dni: campos[4],
  };
  return validarNombre(datos.nombres) && validarNombre(datos.apellidos) && validarDni(datos.dni)
    ? datos
    : null;
}
