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
      className="min-h-14 items-center justify-center rounded-2xl border-2 border-orange-100/40 bg-red-900 px-3 py-3"
      onPress={() => onVerQr(mesa)}
      accessibilityRole="button"
      accessibilityLabel={`Ver código QR de la mesa ${mesa.numero}`}
    >
      <Ionicons name="qr-code-outline" size={28} color="#FFE4C7" />
      {!compacta ? <Text className="mt-1 text-center font-bold text-yellow-50">Ver código QR</Text> : null}
    </Pressable>
  );

  return (
    <View className="rounded-3xl border-2 border-orange-100/40 bg-red-900/70 p-3">
      <View className="flex-row items-center gap-3">
        <View className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-orange-100/40 bg-orange-950/55">
          {fotoValida ? <Image source={{ uri: mesa.foto }} className="h-full w-full" resizeMode="cover" /> : (
            <View className="flex-1 items-center justify-center"><Ionicons name="restaurant-outline" size={30} color="#FFE4C7" /></View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-2xl font-bold text-yellow-50" accessibilityRole="header">Mesa {mesa.numero}</Text>
          <Text className="mt-1 text-base text-yellow-100">{mesa.tipo === "VIP" ? "Preferencial" : mesa.tipo === "estándar" ? "Estándar" : "Movilidad reducida"} · {mesa.cantidad_comensales} comensales</Text>
          <Pressable
            className="mt-2 min-h-12 self-start flex-row items-center gap-2 rounded-full border border-orange-100/40 bg-red-900 px-3 py-2"
            onPress={() => onCambiarDisponibilidad(mesa)}
            disabled={actualizando}
            accessibilityRole="button"
            accessibilityLabel={`Mesa ${mesa.numero} ${estaVacia ? "vacía" : "ocupada"}. Marcar como ${estaVacia ? "ocupada" : "vacía"}`}
            accessibilityState={{ disabled: actualizando }}
          >
            <Ionicons name={estaVacia ? "checkmark-circle-outline" : "people-outline"} size={20} color="#FFE4C7" />
            <Text className="shrink text-base font-bold text-yellow-50">{estaVacia ? "Vacía" : "Ocupada"}</Text>
          </Pressable>
        </View>
        {compacta ? botonQr : null}
      </View>
      {!compacta ? <View className="mt-3">{botonQr}</View> : null}
    </View>
  );
}
