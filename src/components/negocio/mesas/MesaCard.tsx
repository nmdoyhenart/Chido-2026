import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import type { Mesa } from "../../../types/mesa";

type MesaCardProps = {
  mesa: Mesa;
  actualizando: boolean;
  onCambiarDisponibilidad: (mesa: Mesa) => void;
  onVerQr: (mesa: Mesa) => void;
};

export function MesaCard({ mesa, actualizando, onCambiarDisponibilidad, onVerQr }: MesaCardProps) {
  const { width, fontScale } = useWindowDimensions();
  const compacta = width >= 350 && fontScale <= 1.3;
  const estaVacia = mesa.disponibilidad === "vacía";
  const fotoValida = /^https?:\/\//.test(mesa.foto);

  const botonQr = (
    <Pressable
      className="min-h-20 min-w-20 items-center justify-center rounded-3xl border-2 border-[#e6b18c] bg-[#9c5120] px-3 py-3"
      onPress={() => onVerQr(mesa)}
      accessibilityRole="button"
      accessibilityLabel={`Ver código QR de la mesa ${mesa.numero}`}
    >
      <Ionicons name="qr-code-outline" size={28} color="#fff4ea" />
      {!compacta ? <Text className="mt-1 text-center font-bold text-[#fff4ea]">Ver código QR</Text> : null}
    </Pressable>
  );

  return (
    <View className="rounded-3xl border-2 border-[#e6b18c] bg-[#b35e25] p-5">
      <View className="flex-row items-center gap-4">
        <View className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-[#9c5120]">
          {fotoValida ? <Image source={{ uri: mesa.foto }} className="h-full w-full" resizeMode="cover" /> : (
            <View className="flex-1 items-center justify-center"><Ionicons name="grid-outline" size={42} color="#fff4ea" /></View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-3xl font-bold text-[#fff4ea]" accessibilityRole="header">Mesa {mesa.numero}</Text>
          <Text className="mt-1 text-lg text-[#f2c4a8]">{mesa.tipo === "VIP" ? "Preferencial" : mesa.tipo === "estándar" ? "Estándar" : "Movilidad reducida"} · {mesa.cantidad_comensales} comensales</Text>
          <Pressable
            className={`mt-3 min-h-11 self-start flex-row items-center gap-2 rounded-full px-3 py-2 ${estaVacia ? "bg-[#ad7938]" : "bg-[#d35c3b]"}`}
            onPress={() => onCambiarDisponibilidad(mesa)}
            disabled={actualizando}
            accessibilityRole="button"
            accessibilityLabel={`Mesa ${mesa.numero} ${estaVacia ? "vacía" : "ocupada"}. Marcar como ${estaVacia ? "ocupada" : "vacía"}`}
            accessibilityState={{ disabled: actualizando }}
          >
            <View className={`h-3 w-3 rounded-full ${estaVacia ? "bg-[#8ee36b]" : "bg-[#ff6b5c]"}`} />
            <Text className="shrink text-lg font-bold text-[#fff4ea]">{estaVacia ? "Vacía" : "Ocupada"}</Text>
          </Pressable>
        </View>
        {compacta ? botonQr : null}
      </View>
      {!compacta ? <View className="mt-3">{botonQr}</View> : null}
    </View>
  );
}
