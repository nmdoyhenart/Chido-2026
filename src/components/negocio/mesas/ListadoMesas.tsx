import { useMemo, useRef, useState } from "react";
import { ScrollView, Text, Pressable, View } from "react-native";
import type { Mesa } from "../../../types/mesa";
import { MesaCard } from "./MesaCard";

const MESAS_POR_PAGINA = 2;
const SEPARACION = 12;
const RELLENO_VERTICAL = 12;

function agruparDeADos(cantidad: number): number[][] {
  return Array.from({ length: Math.ceil(cantidad / MESAS_POR_PAGINA) }, (_, pagina) => {
    const inicio = pagina * MESAS_POR_PAGINA;
    return Array.from(
      { length: Math.min(MESAS_POR_PAGINA, cantidad - inicio) },
      (_, indice) => inicio + indice,
    );
  });
}

type ListadoMesasProps = {
  mesas: Mesa[];
  onLiberar: (mesa: Mesa) => void;
  onVerQr: (mesa: Mesa) => void;
};

export function ListadoMesas({ mesas, onLiberar, onVerQr }: ListadoMesasProps) {
  const firma = mesas.map((mesa) => mesa.id).join(",");
  return <ListadoMesasContenido key={firma} mesas={mesas} onLiberar={onLiberar} onVerQr={onVerQr} />;
}

function ListadoMesasContenido({ mesas, onLiberar, onVerQr }: ListadoMesasProps) {
  const scroll = useRef<ScrollView>(null);
  const [alto, setAlto] = useState(0);
  const [pagina, setPagina] = useState(0);
  const paginas = useMemo(() => agruparDeADos(mesas.length), [mesas.length]);
  const offsetsPagina = paginas.map((_, indicePagina) => indicePagina * alto);
  const paginaActual = Math.min(pagina, Math.max(0, paginas.length - 1));

  function irAPagina(destino: number) {
    const paginaDestino = Math.max(0, Math.min(paginas.length - 1, destino));
    setPagina(paginaDestino);
    scroll.current?.scrollTo({
      y: offsetsPagina[paginaDestino] ?? paginaDestino * alto,
      animated: true,
    });
  }

  function actualizarPaginaDesdeDesplazamiento(y: number) {
    if (alto <= 0 || offsetsPagina.length === 0) return;
    const visible = Math.max(0, Math.min(paginas.length - 1, Math.round(y / alto)));
    setPagina((actual) => actual === visible ? actual : visible);
  }

  return (
    <View className="flex-1">
      <View className="flex-1" onLayout={(event) => setAlto(Math.floor(event.nativeEvent.layout.height))}>
        {alto > 0 ? (
          <ScrollView
            ref={scroll}
            pagingEnabled
            snapToInterval={alto}
            decelerationRate="fast"
            disableIntervalMomentum
            bounces={false}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={100}
            onScroll={(event) => actualizarPaginaDesdeDesplazamiento(event.nativeEvent.contentOffset.y)}
            onMomentumScrollEnd={(event) => actualizarPaginaDesdeDesplazamiento(event.nativeEvent.contentOffset.y)}
          >
            {paginas.map((indices, indicePagina) => {
              const altoTarjeta = indices.length === MESAS_POR_PAGINA
                ? Math.max(0, (alto - RELLENO_VERTICAL * 2 - SEPARACION) / MESAS_POR_PAGINA)
                : Math.max(0, alto - RELLENO_VERTICAL * 2);
              return (
                <View
                  key={indices.map((indice) => mesas[indice].id).join(",")}
                  style={{ height: alto, paddingHorizontal: 20, paddingVertical: RELLENO_VERTICAL }}
                >
                  <View style={{ flex: 1, justifyContent: "space-between", gap: SEPARACION }}>
                    {indices.map((indice) => {
                      const mesa = mesas[indice];
                      return (
                        <MesaCard
                          key={mesa.id}
                          mesa={mesa}
                          altoMinimo={altoTarjeta}
                          actualizando={false}
                          onLiberar={onLiberar}
                          onVerQr={onVerQr}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
      <View className="gap-2 px-5 pb-2">
        <Text accessibilityLiveRegion="polite" className="text-center text-sm font-bold text-chido-texto-sobre-oscuro">
          Página {paginaActual + 1} de {paginas.length}
        </Text>
        <Text className="text-center text-sm text-chido-texto-secundario-sobre-oscuro">Deslizá para recorrer la lista.</Text>
        <View className="flex-row gap-3">
          <Pressable accessibilityRole="button" disabled={paginaActual === 0} onPress={() => irAPagina(paginaActual - 1)} className={`min-h-12 flex-1 justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-2 py-2 ${paginaActual === 0 ? "opacity-60" : ""}`}>
            <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Anterior</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={paginaActual >= paginas.length - 1} onPress={() => irAPagina(paginaActual + 1)} className={`min-h-12 flex-1 justify-center rounded-2xl border-2 border-chido-texto-secundario-alternativo bg-chido-acento px-2 py-2 ${paginaActual >= paginas.length - 1 ? "opacity-60" : ""}`}>
            <Text className="text-center font-bold text-chido-texto-sobre-oscuro">Siguiente</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
