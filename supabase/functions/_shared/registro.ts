import { validarRegistroCliente, validarFotoBase64, type DatosRegistroCliente, type ErroresRegistro } from '../../../shared/registro-cliente.ts';

export class FalloRegistro extends Error {
  codigo: string;
  status: number;
  campos?: ErroresRegistro;
  constructor(codigo: string, mensaje: string, status = 400, campos?: ErroresRegistro) {
    super(mensaje);
    this.codigo = codigo;
    this.status = status;
    this.campos = campos;
  }
}

export interface RegistroGateway {
  buscarDuplicado: (datos: DatosRegistroCliente) => Promise<'correo' | 'dni' | null>;
  crearCuenta: (datos: DatosRegistroCliente) => Promise<string>;
  subirFoto: (ruta: string, foto: Uint8Array) => Promise<void>;
  crearPerfil: (authId: string, datos: DatosRegistroCliente, ruta: string) => Promise<void>;
  perfilExiste: (authId: string) => Promise<boolean>;
  borrarFoto: (ruta: string) => Promise<void>;
  borrarCuenta: (authId: string) => Promise<void>;
  informarLimpiezaFallida: (authId: string) => void;
}

export function fotoJpeg(base64: string): Uint8Array {
  if (!validarFotoBase64(base64)) throw new FalloRegistro('FOTO_INVALIDA', 'Volvé a tomar la foto personal.');
  const bytes = Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0));
  if (bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    throw new FalloRegistro('FOTO_INVALIDA', 'La foto está incompleta. Volvé a tomarla.');
  }
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marcador = bytes[offset + 1];
    const longitud = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (longitud < 2 || offset + 2 + longitud > bytes.length) break;
    if (marcador === 0xc0 || marcador === 0xc2) {
      const alto = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const ancho = (bytes[offset + 7] << 8) | bytes[offset + 8];
      if (ancho > 0 && alto > 0 && ancho <= 4096 && alto <= 4096) return bytes;
      break;
    }
    offset += longitud + 2;
  }
  throw new FalloRegistro('FOTO_INVALIDA', 'El formato o tamaño de la foto no es válido. Volvé a tomarla.');
}

export async function registrarCliente(input: unknown, gateway: RegistroGateway): Promise<void> {
  const { datos, errores } = validarRegistroCliente(input);
  if (Object.keys(errores).length) throw new FalloRegistro('VALIDACION', 'Revisá los campos indicados.', 400, errores);
  let foto: Uint8Array;
  try { foto = fotoJpeg(datos.fotoBase64); }
  catch (error) {
    if (error instanceof FalloRegistro) error.campos = { fotoBase64: error.message };
    throw error;
  }
  const duplicado = await gateway.buscarDuplicado(datos);
  if (duplicado) throw new FalloRegistro('DUPLICADO', 'Ya existe un registro con esos datos.', 409, {
    [duplicado]: duplicado === 'correo' ? 'Ya existe una cuenta con este correo.' : 'Ya existe un cliente con este DNI.',
  });

  let authId: string | undefined;
  let ruta: string | undefined;
  let guardandoPerfil = false;
  try {
    authId = await gateway.crearCuenta(datos);
    ruta = `${authId}/perfil.jpg`;
    await gateway.subirFoto(ruta, foto);
    // El INSERT incluye el aviso de correo mediante un trigger
    guardandoPerfil = true;
    await gateway.crearPerfil(authId, datos, ruta);
  } catch (error) {
    if (authId) {
      if (guardandoPerfil) {
        // Una respuesta perdida no implica que el INSERT haya fallado.
        // No borrar Auth/foto de un perfil que sí se guardó.
        try { if (await gateway.perfilExiste(authId)) return; }
        catch {
          gateway.informarLimpiezaFallida(authId);
          throw new FalloRegistro('RESULTADO_INCIERTO', 'No pudimos confirmar el resultado. Intentá ingresar antes de repetir el registro.', 503);
        }
      }
      const limpieza = await Promise.allSettled([
        ...(ruta ? [gateway.borrarFoto(ruta)] : []),
        gateway.borrarCuenta(authId),
      ]);
      if (limpieza.some((resultado) => resultado.status === 'rejected')) gateway.informarLimpiezaFallida(authId);
    }
    throw error;
  }
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function leerJsonLimitado(request: Request, maximo = 3 * 1024 * 1024): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new FalloRegistro('FORMATO', 'La solicitud debe enviarse en formato JSON.', 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new FalloRegistro('FORMATO', 'La solicitud está vacía.');
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximo) {
        await reader.cancel();
        throw new FalloRegistro('TAMANO', 'La solicitud es demasiado grande. Volvé a tomar la foto.', 413);
      }
      partes.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) { bytes.set(parte, offset); offset += parte.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new FalloRegistro('FORMATO', 'No se pudo interpretar la solicitud.'); }
}
