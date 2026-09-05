import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import type { Mesa } from "../../../types/mesa";

type MesaCardProps = {
  mesa: Mesa;
  actualizando: boolean;
  onCambiarDisponibilidad: (mesa: Mesa) => void;
  onVerQr: (mesa: Mesa) => void;
};

function esUrlDeFoto(valor: string) {
  return valor.startsWith("https://") || valor.startsWith("http://");
}

export function MesaCard({
  mesa,
  actualizando,
  onCambiarDisponibilidad,
  onVerQr,
}: MesaCardProps) {
  const estaVacia = mesa.disponibilidad === "vacía";

  return (
    <View className="flex-1 flex-row items-center rounded-3xl border-2 border-[#e9a978] bg-[#b7602d] p-3">
      <View className="h-20 w-20 overflow-hidden rounded-2xl bg-[#99481f]">
        {esUrlDeFoto(mesa.foto) ? (
          <Image source={{ uri: mesa.foto }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="restaurant-outline" size={38} color="#fff3de" />
          </View>
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-serif text-2xl font-bold text-[#fff3de]">Mesa {mesa.numero}</Text>
        <Text className="mt-1 text-base text-[#fff3de]" numberOfLines={2}>
          {mesa.tipo} · {mesa.cantidad_comensales} comensales
        </Text>
        <Pressable
          className={`mt-2 self-start rounded-full px-4 py-2 ${
            estaVacia ? "bg-[#bd8139]" : "bg-[#cf5b38]"
          }`}
          onPress={() => onCambiarDisponibilidad(mesa)}
          disabled={actualizando}
          accessibilityLabel={`Marcar mesa ${mesa.numero} como ${estaVacia ? "ocupada" : "vacía"}`}
        >
          <View className="flex-row items-center">
            <View className={`h-3 w-3 rounded-full ${estaVacia ? "bg-[#8fe66b]" : "bg-[#ff6f61]"}`} />
            <Text className="ml-2 text-base font-bold text-[#fff3de]">
              {estaVacia ? "Vacía" : "Ocupada"}
            </Text>
          </View>
        </Pressable>
      </View>
      <Pressable
        className="ml-2 h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#e9a978] bg-[#99481f]"
        onPress={() => onVerQr(mesa)}
        accessibilityLabel={`Ver código QR de la mesa ${mesa.numero}`}
      >
        <Ionicons name="qr-code-outline" size={32} color="#fff3de" />
      </Pressable>
    </View>
  );
}
