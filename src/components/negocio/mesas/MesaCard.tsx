import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import type { Mesa } from "../../../types/mesa";
import { colores } from "../../../theme/colores";

type MesaCardProps = {
  mesa: Mesa;
  actualizando: boolean;
  onLiberar: (mesa: Mesa) => void;
  onVerQr: (mesa: Mesa) => void;
};

export function MesaCard({ mesa, actualizando, onLiberar, onVerQr }: MesaCardProps) {
  const { width, fontScale } = useWindowDimensions();
  const compacta = width >= 350 && fontScale <= 1.3;
  const estaVacia = mesa.disponibilidad === "vacía";
  const fotoValida = /^https?:\/\//.test(mesa.foto);

  const botonQr = (
    <Pressable
      className="min-h-20 min-w-20 items-center justify-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera px-3 py-3"
      onPress={() => onVerQr(mesa)}
      accessibilityRole="button"
      accessibilityLabel={`Ver código QR de la mesa ${mesa.numero}`}
    >
      <Ionicons name="qr-code-outline" size={28} color={colores.textoSobreOscuro} />
      {!compacta ? <Text className="mt-1 text-center font-bold text-chido-texto-sobre-oscuro">Ver código QR</Text> : null}
    </Pressable>
  );

  return (
    <View className="rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento p-5">
      <View className="flex-row items-center gap-4">
        <View className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-chido-cabecera">
          {fotoValida ? <Image source={{ uri: mesa.foto }} className="h-full w-full" resizeMode="cover" /> : (
            <View className="flex-1 items-center justify-center"><Ionicons name="grid-outline" size={42} color={colores.textoSobreOscuro} /></View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro" accessibilityRole="header">Mesa {mesa.numero}</Text>
          <Text className="mt-1 text-lg text-chido-texto-secundario-sobre-oscuro">{mesa.tipo === "VIP" ? "Preferencial" : mesa.tipo === "estándar" ? "Estándar" : "Movilidad reducida"} · {mesa.cantidad_comensales} comensales</Text>
          <View className={`mt-3 min-h-11 self-start flex-row items-center gap-2 rounded-full px-3 py-2 ${estaVacia ? "bg-chido-exito/55" : "bg-chido-error/55"}`}>
            <View className={`h-3 w-3 rounded-full ${estaVacia ? "bg-chido-activo" : "bg-chido-notificacion"}`} />
            <Text className="shrink text-lg font-bold text-chido-texto-sobre-oscuro">{estaVacia ? "Vacía" : "Ocupada"}</Text>
          </View>
        </View>
        {compacta ? botonQr : null}
      </View>
      {!estaVacia ? (
        <Pressable
          className="mt-4 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera px-4 py-3"
          onPress={() => onLiberar(mesa)}
          disabled={actualizando}
          accessibilityRole="button"
          accessibilityLabel={`Liberar mesa ${mesa.numero}`}
          accessibilityState={{ disabled: actualizando }}
        >
          <Ionicons name="exit-outline" size={21} color={colores.textoSobreOscuro} />
          <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Liberar mesa</Text>
        </Pressable>
      ) : null}
      {!compacta ? <View className="mt-3">{botonQr}</View> : null}
    </View>
  );
}
