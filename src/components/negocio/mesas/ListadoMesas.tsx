import { useRef, useState } from "react";
import { ScrollView, Text, Pressable, View } from "react-native";
import type { Mesa } from "../../../types/mesa";
import { agruparTarjetasPorAltura } from "../../../utils/paginacionMesas";
import { MesaCard } from "./MesaCard";

type ListadoMesasProps = {
  mesas: Mesa[];
  onLiberar: (mesa: Mesa) => void;
  onVerQr: (mesa: Mesa) => void;
};

export function ListadoMesas({ mesas, onLiberar, onVerQr }: ListadoMesasProps) {
  const scroll = useRef<ScrollView>(null);
  const [alto, setAlto] = useState(0);
  const [alturas, setAlturas] = useState<Record<string, number>>({});
  const [mesaVisible, setMesaVisible] = useState<string | null>(mesas[0]?.id ?? null);
  const [lectura, setLectura] = useState<Record<string, number>>({});
  const espacio = Math.max(1, alto - 24);
  const paginas = agruparTarjetasPorAltura(mesas.map((mesa) => alturas[mesa.id] ?? espacio), espacio);
  const actual = Math.max(0, paginas.findIndex((indices) => indices.some((indice) => mesas[indice].id === mesaVisible)));
  const firma = paginas.map((indices) => indices.map((indice) => mesas[indice].id).join(",")).join(";");
  const desborda = paginas[actual]?.some((indice) => (alturas[mesas[indice].id] ?? 0) > espacio);

  function irAPagina(destino: number) {
    setMesaVisible(mesas[paginas[destino][0]].id);
    scroll.current?.scrollTo({ y: destino * alto, animated: true });
  }

  return (
    <View className="flex-1">
      <View className="flex-1" onLayout={(event) => setAlto(Math.floor(event.nativeEvent.layout.height))}>
        {alto > 0 ? (
          <ScrollView
            key={`${alto}:${firma}`}
            ref={scroll}
            pagingEnabled
            snapToInterval={alto}
            decelerationRate="fast"
            disableIntervalMomentum
            bounces={false}
            scrollEnabled={!desborda}
            showsVerticalScrollIndicator={false}
            contentOffset={{ x: 0, y: actual * alto }}
            onMomentumScrollEnd={(event) => {
              const destino = Math.max(0, Math.min(paginas.length - 1, Math.round(event.nativeEvent.contentOffset.y / alto)));
              setMesaVisible(mesas[paginas[destino][0]].id);
            }}
          >
            {paginas.map((indices) => {
              const necesitaScroll = indices.some((indice) => (alturas[mesas[indice].id] ?? 0) > espacio);
              return (
                <View key={indices.map((indice) => mesas[indice].id).join(",")} style={{ height: alto }}>
                  <ScrollView
                    scrollEnabled={necesitaScroll}
                    nestedScrollEnabled={necesitaScroll}
                    contentContainerStyle={{ flexGrow: 1, paddingVertical: 12 }}
                    contentOffset={{ x: 0, y: necesitaScroll ? lectura[mesas[indices[0]].id] ?? 0 : 0 }}
                    scrollEventThrottle={100}
                    onScroll={necesitaScroll ? (event) => {
                      const id = mesas[indices[0]].id;
                      const y = event.nativeEvent.contentOffset.y;
                      setLectura((anterior) => anterior[id] === y ? anterior : { ...anterior, [id]: y });
                    } : undefined}
                  >
                    <View className="gap-3 px-5">
                      {indices.map((indice) => {
                        const mesa = mesas[indice];
                        return (
                          <View key={mesa.id} onLayout={(event) => {
                            const altura = Math.ceil(event.nativeEvent.layout.height);
                            setAlturas((anteriores) => anteriores[mesa.id] === altura ? anteriores : { ...anteriores, [mesa.id]: altura });
                          }}>
                            <MesaCard mesa={mesa} actualizando={false} onLiberar={onLiberar} onVerQr={onVerQr} />
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
      <View className="gap-2 px-5 pb-2">
        <Text accessibilityLiveRegion="polite" className="text-center text-sm font-bold text-chido-texto-sobre-oscuro">
          Página {actual + 1} de {paginas.length}
        </Text>
        <Text className="text-center text-sm text-chido-texto-secundario-sobre-oscuro">Deslizá para recorrer el contenido.</Text>
        <View className="flex-row gap-3">
          <Pressable accessibilityRole="button" disabled={actual === 0} onPress={() => irAPagina(actual - 1)} className={`min-h-12 flex-1 justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-2 py-2 ${actual === 0 ? "opacity-60" : ""}`}>
            <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Anterior</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={actual >= paginas.length - 1} onPress={() => irAPagina(actual + 1)} className={`min-h-12 flex-1 justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-2 py-2 ${actual >= paginas.length - 1 ? "opacity-60" : ""}`}>
            <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Siguiente</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
