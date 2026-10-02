import { supabase } from "../../lib/supabase";
import type { MesaQr } from "../types/qr";
import { parseQrPayload } from "../utils/qr";
import type {
  DisponibilidadMesa,
  Mesa,
  ClienteRegistradoSolicitudMesa,
  NuevaMesa,
} from "../types/mesa";
import { eliminarFotoMesa, subirFotoMesa } from "./storage";

const CAMPOS_MESA =
  "id, numero, cantidad_comensales, tipo, disponibilidad, foto, cliente_id, qr_confirmado_at";

export async function obtenerMesas(signal?: AbortSignal): Promise<Mesa[]> {
  const consulta = supabase
    .from("mesas")
    .select(CAMPOS_MESA)
    .order("numero", { ascending: true });
  const { data, error } = await (signal ? consulta.abortSignal(signal) : consulta);

  if (error) throw new Error("No se pudo obtener el listado de mesas.");

  return (data ?? []) as Mesa[];
}

export async function crearMesa(datos: NuevaMesa): Promise<Mesa> {
  const { data: existente, error: errorExistente } = await supabase
    .from("mesas")
    .select("id")
    .eq("numero", datos.numero)
    .maybeSingle();

  if (errorExistente) {
    throw new Error("No se pudo verificar el número de mesa.");
  }
  if (existente) {
    throw new Error("Ya existe una mesa con ese número.");
  }

  const fotoUrl = await subirFotoMesa(datos.fotoBase64);
  const { data, error } = await supabase
    .from("mesas")
    .insert({
      numero: datos.numero,
      cantidad_comensales: datos.cantidadComensales,
      tipo: datos.tipo,
      disponibilidad: "vacía",
      foto: fotoUrl,
    })
    .select(CAMPOS_MESA)
    .single();

  if (error) {
    await eliminarFotoMesa(fotoUrl);
    if (error.code === "23505") {
      throw new Error("Ya existe una mesa con ese número.");
    }
    throw new Error("No se pudo guardar la nueva mesa.");
  }

  return data as Mesa;
}

export async function actualizarDisponibilidadMesa(
  mesaId: string,
  disponibilidad: DisponibilidadMesa,
): Promise<Mesa> {
  const { data, error } = await supabase
    .from("mesas")
    .update({ disponibilidad })
    .eq("id", mesaId)
    .select(CAMPOS_MESA)
    .single();

  if (error) throw new Error("No se pudo actualizar la disponibilidad de la mesa.");

  return data as Mesa;
}

export async function asignarClienteAMesa(
  mesaId: string,
  clienteId: string,
): Promise<Mesa> {
  const { data, error } = await supabase
    .from("mesas")
    .update({
      cliente_id: clienteId,
      disponibilidad: "ocupada",
      qr_confirmado_at: null,
    })
    .eq("id", mesaId)
    .eq("disponibilidad", "vacía")
    .is("cliente_id", null)
    .select(CAMPOS_MESA)
    .maybeSingle();

  if (error?.code === "23505") {
    throw new Error("El cliente ya tiene otra mesa asignada.");
  }
  if (error) throw new Error("No se pudo asignar el cliente a la mesa.");
  if (!data) throw new Error("La mesa ya no está disponible.");

  const { error: errorListaEspera } = await supabase
    .from("lista_espera")
    .delete()
    .eq("usuario_id", clienteId);

  if (errorListaEspera) {
    throw new Error("La mesa fue asignada, pero no se pudo quitar al cliente de la lista de espera.");
  }

  return data as Mesa;
}

export async function liberarMesa(mesaId: string): Promise<Mesa> {
  const { data, error } = await supabase
    .from("mesas")
    .update({
      cliente_id: null,
      disponibilidad: "vacía",
      qr_confirmado_at: null,
    })
    .eq("id", mesaId)
    .select(CAMPOS_MESA)
    .single();

  if (error) throw new Error("No se pudo liberar la mesa.");

  return data as Mesa;
}

export async function obtenerMesaAsignada(usuarioId: string): Promise<MesaQr | null> {
  const { data, error } = await supabase
    .from("mesas")
    .select(
      "id, numero, cantidad_comensales, tipo, disponibilidad, cliente_id, qr_confirmado_at",
    )
    .eq("cliente_id", usuarioId)
    .maybeSingle();

  if (error) throw new Error("No se pudo verificar la mesa asignada.");

  return (data as MesaQr | null) ?? null;
}

export type EstadoSolicitudMesa = {
  enEspera: boolean;
  mesa: MesaQr | null;
};

export async function obtenerEstadoSolicitudMesa(usuarioId: string): Promise<EstadoSolicitudMesa> {
  const [mesa, solicitud] = await Promise.all([
    obtenerMesaAsignada(usuarioId),
    supabase
      .from("lista_espera")
      .select("id")
      .eq("usuario_id", usuarioId)
      .eq("estado", "esperando")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (solicitud.error) throw new Error("No se pudo verificar tu solicitud de mesa.");

  return { mesa, enEspera: Boolean(solicitud.data) };
}

export async function solicitarMesa(cliente: ClienteRegistradoSolicitudMesa): Promise<EstadoSolicitudMesa> {
  const nombre = [cliente.nombres, cliente.apellidos].filter(Boolean).join(" ").trim();
  if (!nombre) throw new Error("Tu cuenta no tiene un nombre válido para solicitar una mesa.");
  if (!cliente.foto_perfil.trim()) throw new Error("Tu cuenta no tiene una foto válida para solicitar una mesa.");

  const estado = await obtenerEstadoSolicitudMesa(cliente.id);
  if (estado.mesa) throw new Error(`Ya tenés asignada la mesa ${estado.mesa.numero}.`);
  if (estado.enEspera) return estado;

  const { error } = await supabase
    .from("lista_espera")
    .insert({
      identificador: cliente.id,
      nombre,
      foto_url: cliente.foto_perfil,
      tipo_cliente: "registrado",
      estado: "esperando",
      usuario_id: cliente.id,
    });

  if (error?.code === "23505") return { enEspera: true, mesa: null };
  if (error) throw new Error("No se pudo enviar la solicitud de mesa.");

  return { enEspera: true, mesa: null };
}

export async function ingresarALaListaDeEspera(
  cliente: ClienteRegistradoSolicitudMesa,
  rawQr: string,
): Promise<void> {
  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== "ingreso") {
    throw new Error("El código escaneado no corresponde al ingreso al local.");
  }

  const mesa = await obtenerMesaAsignada(usuarioId);
  if (mesa) throw new Error("Ya tenés una mesa asignada.");

  const { error } = await supabase.rpc("ingresar_lista_espera_cliente");
  if (error?.code === "23505") throw new Error("Ya tenés una mesa asignada.");
  if (error) throw new Error(error.message || "No se pudo registrar el ingreso a la lista de espera.");
}

export type EstadoListaEsperaCliente = {
  estado: "sin_registro" | "esperando" | "asignado";
  mesa_id?: string | null;
  mesa_numero?: number | null;
};

export async function obtenerEstadoListaEsperaCliente(): Promise<EstadoListaEsperaCliente> {
  const { data, error } = await supabase.rpc("estado_lista_espera_cliente");
  if (error) throw new Error(error.message || "No se pudo consultar la lista de espera.");
  return data as EstadoListaEsperaCliente;
}

export async function confirmarMesaPorQr(
  usuarioId: string,
  rawQr: string,
): Promise<MesaQr> {
  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== "mesa") {
    throw new Error("El código escaneado no corresponde a una mesa.");
  }

  const mesa = await obtenerMesaAsignada(usuarioId);
  if (!mesa) {
    throw new Error("Todavía no tenés una mesa asignada.");
  }
  if (mesa.id !== payload.mesaId) {
    throw new Error(
      `Mesa incorrecta. Te asignaron la mesa ${mesa.numero}.`,
    );
  }

  if (mesa.qr_confirmado_at) return mesa;
  const { error: errorConfirmacion } = await supabase.rpc('confirmar_mesa_qr_cliente', {
    p_mesa_id: mesa.id,
  });
  if (errorConfirmacion) throw errorConfirmacion;
  return { ...mesa, qr_confirmado_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("mesas")
    .update({ qr_confirmado_at: new Date().toISOString() })
    .eq("id", mesa.id)
    .eq("cliente_id", usuarioId)
    .is("qr_confirmado_at", null)
    .select(
      "id, numero, cantidad_comensales, tipo, disponibilidad, cliente_id, qr_confirmado_at",
    )
    .maybeSingle();

  if (error) throw new Error("No se pudo confirmar la mesa.");
  if (!data) {
    const mesaActualizada = await obtenerMesaAsignada(usuarioId);
    if (mesaActualizada?.qr_confirmado_at) return mesaActualizada;
    throw new Error("La mesa ya no está disponible para confirmar.");
  }

  return data as MesaQr;
}

export async function obtenerMesaDesdeQr(
  perfil: string,
  rawQr: string,
): Promise<MesaQr> {
  const perfilesAutorizados = ["dueño", "supervisor", "metre", "mozo"];
  if (!perfilesAutorizados.includes(perfil)) {
    throw new Error("Tu perfil no está autorizado para consultar mesas.");
  }

  const payload = parseQrPayload(rawQr);
  if (!payload || payload.tipo !== "mesa") {
    throw new Error("El código escaneado no corresponde a una mesa.");
  }

  const { data, error } = await supabase
    .from("mesas")
    .select(
      "id, numero, cantidad_comensales, tipo, disponibilidad, cliente_id, qr_confirmado_at",
    )
    .eq("id", payload.mesaId)
    .maybeSingle();

  if (error || !data) throw new Error("La mesa indicada no existe.");

  return data as MesaQr;
}
export const getMesasMozo = async (): Promise<Mesa[]> => {
  const { data, error } = await supabase.from('mesas').select('*').order('numero', { ascending: true });
  if (error) throw error;
  return data as Mesa[];
};
