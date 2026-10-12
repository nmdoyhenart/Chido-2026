import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import type { Mesa } from "../../../types/mesa";
import { colores } from "../../../theme/colores";

type MesaCardProps = {
  mesa: Mesa;
  altoMinimo?: number;
  actualizando: boolean;
  onLiberar: (mesa: Mesa) => void;
  onVerQr: (mesa: Mesa) => void;
};

export function MesaCard({ mesa, altoMinimo, actualizando, onLiberar, onVerQr }: MesaCardProps) {
  const { width, fontScale } = useWindowDimensions();
  const compacta = width >= 350 && fontScale <= 1.3;
  const estaVacia = mesa.disponibilidad === "vacía";
  const fotoValida = /^https?:\/\//.test(mesa.foto);

  const botonQr = (
    <Pressable
      className={`${compacta ? "h-[4.5rem] w-[4.5rem]" : "min-h-20 min-w-20"} items-center justify-center rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera px-2 py-2`}
      onPress={() => onVerQr(mesa)}
      accessibilityRole="button"
      accessibilityLabel={`Ver código QR de la mesa ${mesa.numero}`}
    >
      <Ionicons name="qr-code-outline" size={compacta ? 26 : 28} color={colores.textoSobreOscuro} />
      {!compacta ? <Text className="mt-1 text-center font-bold text-chido-texto-sobre-oscuro">Ver código QR</Text> : null}
    </Pressable>
  );

  return (
    <View className={`rounded-3xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento ${compacta ? "p-3" : "p-5"}`} style={{ minHeight: altoMinimo, justifyContent: estaVacia ? "center" : "space-between" }}>
      <View className={`flex-row items-center ${compacta ? "gap-3" : "gap-4"}`}>
        <View className={`${compacta ? "h-[5.5rem] w-[5.5rem] rounded-2xl" : "h-24 w-24 rounded-3xl"} shrink-0 overflow-hidden bg-chido-cabecera`}>
          {fotoValida ? <Image source={{ uri: mesa.foto }} className="h-full w-full" resizeMode="cover" /> : (
            <View className="flex-1 items-center justify-center"><Ionicons name="grid-outline" size={42} color={colores.textoSobreOscuro} /></View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className={`${compacta ? "text-[1.625rem]" : "text-3xl"} font-bold text-chido-texto-sobre-oscuro`} accessibilityRole="header">Mesa {mesa.numero}</Text>
          <Text className={`${compacta ? "mt-0.5 text-base" : "mt-1 text-lg"} text-chido-texto-secundario-sobre-oscuro`}>{mesa.tipo === "VIP" ? "Preferencial" : mesa.tipo === "estándar" ? "Estándar" : "Movilidad reducida"} · {mesa.cantidad_comensales} comensales</Text>
          <View className={`${compacta ? "mt-2 min-h-9 px-2.5 py-1" : "mt-3 min-h-11 px-3 py-2"} self-start flex-row items-center gap-2 rounded-full ${estaVacia ? "bg-chido-exito/55" : "bg-chido-error/55"}`}>
            <View className={`h-3 w-3 rounded-full ${estaVacia ? "bg-chido-activo" : "bg-chido-notificacion"}`} />
            <Text className={`${compacta ? "text-[1.0625rem]" : "text-lg"} shrink font-bold text-chido-texto-sobre-oscuro`}>{estaVacia ? "Vacía" : "Ocupada"}</Text>
          </View>
        </View>
        {compacta ? botonQr : null}
      </View>
      {!estaVacia ? (
        <Pressable
          className={`${compacta ? "mt-3 min-h-11 py-2" : "mt-4 min-h-12 py-3"} flex-row items-center justify-center gap-2 rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-cabecera px-4`}
          onPress={() => onLiberar(mesa)}
          disabled={actualizando}
          accessibilityRole="button"
          accessibilityLabel={`Liberar mesa ${mesa.numero}`}
          accessibilityState={{ disabled: actualizando }}
        >
          <Ionicons name="exit-outline" size={21} color={colores.textoSobreOscuro} />
          <Text className="text-center text-base font-bold text-chido-texto-sobre-oscuro">Liberar mesa</Text>
        </Pressable>
      ) : null}
      {!compacta ? <View className="mt-3">{botonQr}</View> : null}
    </View>
  );
}
