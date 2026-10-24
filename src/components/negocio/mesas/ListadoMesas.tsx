import { useMemo, useRef, useState } from "react";
import { ScrollView, Text, Pressable, View } from "react-native";
import type { Mesa } from "../../../types/mesa";
import { MesaCard } from "./MesaCard";
import { agruparTarjetasPorAltura } from "../../../utils/paginacionMesas";

const SEPARACION = 12;
const RELLENO_VERTICAL = 12;
const ALTURA_ESTIMADA = 210;

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
  const [alturas, setAlturas] = useState<Record<string, number>>({});
  const alturaContenido = Math.max(0, alto - RELLENO_VERTICAL * 2);
  const paginas = useMemo(
    () => agruparTarjetasPorAltura(mesas.map((mesa) => alturas[mesa.id] ?? ALTURA_ESTIMADA), alturaContenido, SEPARACION),
    [alturaContenido, alturas, mesas],
  );
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

  function registrarAltura(mesaId: string, altura: number) {
    setAlturas((actuales) => Math.abs((actuales[mesaId] ?? 0) - altura) < 2
      ? actuales
      : { ...actuales, [mesaId]: altura });
  }

  return (
    <View className="flex-1">
      <View className="flex-1" onLayout={(event) => setAlto(Math.floor(event.nativeEvent.layout.height))}>
        <View pointerEvents="none" style={{ position: "absolute", left: 20, right: 20, opacity: 0 }}>
          {mesas.map((mesa) => (
            <View key={mesa.id} onLayout={(event) => registrarAltura(mesa.id, Math.ceil(event.nativeEvent.layout.height))}>
              <MesaCard mesa={mesa} actualizando={false} onLiberar={onLiberar} onVerQr={onVerQr} />
            </View>
          ))}
        </View>
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
              const alturasNaturales = indices.map((indice) => alturas[mesas[indice].id] ?? ALTURA_ESTIMADA);
              const alturaUsada = alturasNaturales.reduce((total, alturaTarjeta) => total + alturaTarjeta, 0)
                + Math.max(0, indices.length - 1) * SEPARACION;
              const espacioAdicionalPorTarjeta = Math.max(0, alturaContenido - alturaUsada) / indices.length;
              return (
                <View
                  key={indices.map((indice) => mesas[indice].id).join(",")}
                  style={{ height: alto, paddingHorizontal: 20, paddingVertical: RELLENO_VERTICAL }}
                >
                  <View style={{ gap: SEPARACION }}>
                    {indices.map((indice) => {
                      const mesa = mesas[indice];
                      return (
                        <MesaCard
                          key={mesa.id}
                          mesa={mesa}
                          altoMinimo={(alturas[mesa.id] ?? ALTURA_ESTIMADA) + espacioAdicionalPorTarjeta}
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
