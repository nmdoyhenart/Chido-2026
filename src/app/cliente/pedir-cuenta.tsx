import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../../components/Header';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { QRScanner } from '../../components/ui/QRScanner';
import { ResultadoModal } from '../../components/ui/ResultadoModal';
import { colores } from '../../theme/colores';
import { useAltoDisponible } from '../../hooks/useAltoDisponible';
import { useNombreCliente } from '../../hooks/useNombreCliente';
import { useAppSession } from '../../contexts/AppSessionContext';
import { formatearRolMesa } from '../../utils/formatoMesa';
import { supabase } from '../../lib/supabase';
import {
  obtenerCuentaPedido,
  registrarPropinaPorQr,
  informarPago,
  verificarEstadoPago,
  CuentaCompleta,
  DetalleProductoCuenta,
} from '../../services/cuenta.service';
import {
  getEstadoPedido,
  getEstadoPedidoAnonimo,
  suscribirEstadoPedido,
} from '../../services/pedidos.service';

const SATISFACCION_LABEL: Record<number, string> = {
  0: '0% · Sin propina',
  5: '5% · Regular',
  10: '10% · Buena',
  15: '15% · Muy buena',
  20: '20% · Excelente',
};

export default function PedirCuenta() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { usuario, cerrarSesion } = useAppSession();

  const params = useLocalSearchParams();
  const pedidoId = Array.isArray(params.pedidoId) ? params.pedidoId[0] : params.pedidoId;
  const rawClienteAnonimoId = Array.isArray(params.clienteAnonimoId) ? params.clienteAnonimoId[0] : params.clienteAnonimoId;
  const clienteAnonimoId = rawClienteAnonimoId || undefined;

  const { nombreCliente } = useNombreCliente(clienteAnonimoId);
  const [cuenta, setCuenta] = useState<CuentaCompleta | null>(null);
  const [mesaTipo, setMesaTipo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [pagoInformado, setPagoInformado] = useState(false);
  const [pagoConfirmadoVisible, setPagoConfirmadoVisible] = useState(false);
  const [aviso, setAviso] = useState<{ titulo: string; mensaje: string } | null>(null);
  const [detalleContainerWidth, setDetalleContainerWidth] = useState(0);
  const [paginaActual, setPaginaActual] = useState(0);
  const confirmacionProcesadaRef = useRef(false);

  // En pantallas bajas se achican márgenes y textos para que detalle, resumen y botón no se pisen.
  const { alMedir, compacto } = useAltoDisponible();
  const filaResumen = `flex-row justify-between ${compacto ? 'py-0.5' : 'py-1.5'} items-center`;

  // Ancho exacto del carrusel: si el contenedor ya midió usamos su ancho interior, sino fallback seguro
  const carouselWidth = detalleContainerWidth > 0 ? detalleContainerWidth : Math.max(windowWidth - 64, 280);
  const cardGap = 10;
  const isSingleItem = cuenta?.detalles.length === 1;
  const cardWidth = isSingleItem ? carouselWidth : Math.floor((carouselWidth - cardGap) / 2);

  const detallesEnPares: DetalleProductoCuenta[][] = [];
  if (cuenta?.detalles) {
    for (let i = 0; i < cuenta.detalles.length; i += 2) {
      detallesEnPares.push(cuenta.detalles.slice(i, i + 2));
    }
  }

  const cargarDatos = useCallback(async () => {
    if (!pedidoId) return;
    try {
      const data = await obtenerCuentaPedido(pedidoId, clienteAnonimoId);
      setCuenta(data);
      if (data.mesaTipo) {
        setMesaTipo(data.mesaTipo);
      } else if (data.mesaId) {
        try {
          const { data: mData } = await supabase.from('mesas').select('tipo').eq('id', data.mesaId).maybeSingle();
          if (mData?.tipo) setMesaTipo(mData.tipo);
        } catch {
          // ignore
        }
      }
      if (data.estado === 'pago_informado') {
        setPagoInformado(true);
      } else if (data.estado === 'pagado') {
        setPagoInformado(true);
        if (!confirmacionProcesadaRef.current) {
          confirmacionProcesadaRef.current = true;
          setPagoConfirmadoVisible(true);
        }
      }
    } catch (error: any) {
      setAviso({ titulo: 'No pudimos cargar la cuenta', mensaje: error.message || 'Intentá nuevamente.' });
    } finally {
      setCargando(false);
    }
  }, [clienteAnonimoId, pedidoId]);

  useEffect(() => {
    const inicio = setTimeout(() => { void cargarDatos(); }, 0);
    return () => clearTimeout(inicio);
  }, [cargarDatos]);

  // Escucha activa y polling para detectar cuando el mozo confirma el pago
  useEffect(() => {
    if (!pedidoId || !pagoInformado) return;

    let activo = true;

    const chequearConfirmacion = async () => {
      try {
        const estadoActual = clienteAnonimoId
          ? await getEstadoPedidoAnonimo(clienteAnonimoId, pedidoId)
          : await getEstadoPedido(pedidoId);

        if (activo && estadoActual === 'pagado' && !confirmacionProcesadaRef.current) {
          confirmacionProcesadaRef.current = true;
          setPagoConfirmadoVisible(true);
        }
      } catch {
        try {
          const estadoPago = await verificarEstadoPago(pedidoId, clienteAnonimoId);
          if (activo && estadoPago === 'pagado' && !confirmacionProcesadaRef.current) {
            confirmacionProcesadaRef.current = true;
            setPagoConfirmadoVisible(true);
          }
        } catch {
          // ignore
        }
      }
    };

    void chequearConfirmacion();
    const intervalo = setInterval(() => { void chequearConfirmacion(); }, 2500);

    const desuscribir = clienteAnonimoId
      ? () => {}
      : suscribirEstadoPedido(pedidoId, (nuevoEstado) => {
          if (activo && nuevoEstado === 'pagado' && !confirmacionProcesadaRef.current) {
            confirmacionProcesadaRef.current = true;
            setPagoConfirmadoVisible(true);
          }
        });

    return () => {
      activo = false;
      clearInterval(intervalo);
      desuscribir();
    };
  }, [clienteAnonimoId, pagoInformado, pedidoId]);

  const handleEscaneoQr = async (data: string) => {
    if (!pedidoId) {
      throw new Error('No se encontró el identificador del pedido.');
    }
    await registrarPropinaPorQr(pedidoId, data, clienteAnonimoId);
    await cargarDatos();
  };

  const handleRealizarPago = async () => {
    if (!cuenta || !pedidoId) return;
    setProcesandoPago(true);

    try {
      await new Promise((res) => setTimeout(res, 700));
      await informarPago(pedidoId, clienteAnonimoId);
      setPagoInformado(true);
    } catch (error: any) {
      setAviso({ titulo: 'No pudimos informar el pago', mensaje: error.message || 'Intentá nuevamente.' });
    } finally {
      setProcesandoPago(false);
    }
  };

  const handleConfirmacionPago = async () => {
    setPagoConfirmadoVisible(false);
    const esAnonimo = Boolean(clienteAnonimoId) || !usuario?.id;
    if (esAnonimo) {
      try {
        await cerrarSesion();
      } catch {
        // ignore
      }
      await AsyncStorage.multiRemove([
        'cliente_anonimo_id',
        'cliente_anonimo_nombre',
        'cliente_anonimo_foto_url',
      ]).catch(() => undefined);
      router.replace('/(auth)/login');
    } else {
      router.replace('/cliente/home');
    }
  };

  if (cargando) {
    return (
      <View key="pantalla-cargando" className="flex-1 bg-chido-fondo justify-center items-center">
        <ChidoLoader mensaje="Generando cuenta…" />
      </View>
    );
  }

  if (!cuenta) {
    return (
      <View key="pantalla-sin-cuenta" className="flex-1 bg-chido-fondo justify-center items-center p-6">
        <Ionicons name="alert-circle-outline" size={60} color={colores.textoSobreOscuro} />
        <Text className="text-chido-texto-sobre-oscuro text-xl font-bold mt-4 text-center">
          No encontramos el detalle de tu pedido.
        </Text>
        <TouchableOpacity
          className="mt-6 bg-chido-cabecera px-6 py-3 rounded-xl border border-white/50"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/cliente/home'))}
        >
          <Text className="text-chido-texto-sobre-oscuro font-bold text-base">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tienePropina = cuenta.propinaPorcentaje !== null;

  return (
    <View className="flex-1 bg-chido-fondo">
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        userName={nombreCliente}
        role={formatearRolMesa(cuenta.mesaNumero, mesaTipo || cuenta.mesaTipo, 'Tu Cuenta')}
      />

      {!tienePropina ? (
        <View
          key="pantalla-escanear-propina"
          className="flex-1 px-5 justify-between items-center"
          style={{
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 24) + 12,
          }}
        >
          {/* Mascota grande que ocupa el espacio principal sin scroll */}
          <View className="flex-1 w-full items-center justify-center my-2">
            <Image
              source={require('../../../assets/images/mascota-escanear-qr.png')}
              style={{ width: '100%', height: '100%', maxHeight: 440 }}
              resizeMode="contain"
            />
          </View>

          {/* Textos directos y grandes */}
          <View className="w-full items-center mb-6">
            <Text className="text-chido-texto-sobre-oscuro font-black text-3xl text-center mb-2">
              Escaneá el QR de Propina
            </Text>
            <Text className="text-chido-texto-secundario-sobre-oscuro font-bold text-lg text-center px-2 leading-snug">
              Elegí tu grado de satisfacción del servicio para generar tu cuenta.
            </Text>
          </View>

          {/* Botón con fondo oscuro bg-chido-cabecera */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Escanear código QR de propina"
            className="rounded-2xl border-2 border-white/70 bg-chido-cabecera py-4 px-6 flex-row items-center justify-center w-full shadow-lg active:opacity-90"
            onPress={() => setScannerVisible(true)}
          >
            <Ionicons name="camera-outline" size={32} color={colores.textoSobreOscuro} />
            <Text className="text-chido-texto-sobre-oscuro font-extrabold text-2xl ml-3">
              Escanear QR
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* VISTA DE PAGO CON ESTÉTICA Y COLORES CHIDO (SIN SCROLL VERTICAL) */
        <View
          key="pantalla-resumen-pago"
          className="flex-1 px-4 justify-between"
          onLayout={alMedir}
          style={{
            paddingTop: compacto ? 8 : 12,
            paddingBottom: Math.max(insets.bottom, compacto ? 12 : 16) + 8,
          }}
        >
          {/* 1. Detalle del pedido con scroll horizontal de a 2 productos */}
          <View
            className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${compacto ? 'p-3' : 'p-4'} shadow-md`}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width - (compacto ? 24 : 32);
              if (w > 0 && Math.abs(w - detalleContainerWidth) > 1) {
                setDetalleContainerWidth(w);
              }
            }}
          >
            <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-white/20">
              <View className="flex-row items-center">
                <Ionicons name="receipt-outline" size={24} color={colores.textoSobreOscuro} />
                <Text className="text-2xl font-black text-chido-texto-sobre-oscuro ml-2">
                  Detalle del Pedido
                </Text>
              </View>
              <View className="bg-white/15 px-3 py-1 rounded-full border border-white/30">
                <Text className="text-sm font-extrabold text-chido-texto-sobre-oscuro">
                  {cuenta.detalles.length} {cuenta.detalles.length === 1 ? 'producto' : 'productos'}
                  {detallesEnPares.length > 1 ? ` · ${paginaActual + 1}/${detallesEnPares.length}` : ''}
                </Text>
              </View>
            </View>

            {/* Scroll horizontal con paginación de a 2 productos para que ninguno quede cortado */}
            <ScrollView
              horizontal
              pagingEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'stretch' }}
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const page = Math.round(offsetX / (carouselWidth || 1));
                setPaginaActual(page);
              }}
              scrollEventThrottle={16}
            >
              {detallesEnPares.map((par, pageIndex) => (
                <View
                  key={`page-${pageIndex}`}
                  style={{ width: carouselWidth, flexDirection: 'row', gap: cardGap }}
                >
                  {par.map((item) => (
                    <View
                      key={item.id}
                      style={{ width: cardWidth }}
                      className="bg-black/25 border border-white/30 rounded-xl p-3 justify-between"
                    >
                      <View>
                        <View className="flex-row items-center justify-between mb-2">
                          {item.producto.fotos?.[0] ? (
                            <Image
                              source={{ uri: item.producto.fotos[0] }}
                              className="w-12 h-12 rounded-xl bg-black/30"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-12 h-12 rounded-xl bg-white/10 items-center justify-center">
                              <Ionicons name="restaurant-outline" size={22} color={colores.textoSobreOscuro} />
                            </View>
                          )}
                          <View className="bg-white/20 px-2.5 py-1 rounded-md">
                            <Text className="text-chido-texto-sobre-oscuro font-black text-sm">
                              x{item.cantidad}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className="text-chido-texto-sobre-oscuro font-black text-lg leading-snug mb-1"
                          numberOfLines={2}
                        >
                          {item.producto.nombre}
                        </Text>
                        <Text className="text-chido-texto-secundario-sobre-oscuro font-bold text-sm">
                          ${item.precio_unitario.toLocaleString('es-AR')} c/u
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-baseline pt-2 mt-2 border-t border-white/15">
                        <Text className="text-chido-texto-secundario-sobre-oscuro text-sm font-bold">Subtotal</Text>
                        <Text className="text-chido-texto-sobre-oscuro font-black text-lg">
                          ${item.subtotal.toLocaleString('es-AR')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            {/* Puntos de paginación si hay más de 2 productos */}
            {detallesEnPares.length > 1 && (
              <View className="flex-row justify-center items-center mt-2.5 gap-1.5">
                {detallesEnPares.map((_, i) => (
                  <View
                    key={`dot-${i}`}
                    className={`h-1.5 rounded-full ${
                      paginaActual === i ? 'w-5 bg-white' : 'w-2 bg-white/40'
                    }`}
                  />
                ))}
              </View>
            )}
          </View>

          {/* 2. Resumen del Pago (ocupa el espacio central elásticamente) */}
          <View className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera flex-1 justify-between shadow-md ${compacto ? 'p-3 my-2' : 'p-4 my-3'}`}>
            <View>
              <View className="flex-row items-center justify-between pb-2.5 mb-2 border-b border-white/20">
                <Text className="text-2xl font-black text-chido-texto-sobre-oscuro">
                  Resumen del Pago
                </Text>
                <TouchableOpacity
                  onPress={() => setScannerVisible(true)}
                  className="flex-row items-center bg-white/15 px-3 py-1.5 rounded-xl border border-white/30 active:opacity-80"
                >
                  <Ionicons name="qr-code-outline" size={16} color={colores.textoSobreOscuro} />
                  <Text className="text-chido-texto-sobre-oscuro font-extrabold text-sm ml-1.5">
                    Cambiar propina
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Subtotal */}
              <View className={filaResumen}>
                <Text className="text-chido-texto-secundario-sobre-oscuro font-bold text-lg">
                  Subtotal productos:
                </Text>
                <Text className="text-chido-texto-sobre-oscuro font-extrabold text-xl">
                  ${cuenta.subtotal.toLocaleString('es-AR')}
                </Text>
              </View>

              {/* Descuento juegos (siempre visible con desglose transparente) */}
              {cuenta.descuentoPorcentaje > 0 ? (
                <View className={filaResumen}>
                  <View className="flex-row items-center">
                    <Ionicons name="game-controller" size={20} color="#9be27a" />
                    <Text className="text-[#9be27a] font-bold text-lg ml-1.5">
                      Descuento juegos ({cuenta.descuentoPorcentaje}%):
                    </Text>
                  </View>
                  <Text className="text-[#9be27a] font-black text-xl">
                    -${cuenta.descuentoMonto.toLocaleString('es-AR')}
                  </Text>
                </View>
              ) : (
                <View className={filaResumen}>
                  <View className="flex-row items-center">
                    <Ionicons name="game-controller-outline" size={20} color={colores.textoSecundarioSobreOscuro} />
                    <Text className="text-chido-texto-secundario-sobre-oscuro font-bold text-lg ml-1.5">
                      Descuento juegos (0%):
                    </Text>
                  </View>
                  <Text className="text-chido-texto-secundario-sobre-oscuro font-bold text-lg">
                    $0
                  </Text>
                </View>
              )}

              {/* Propina */}
              <View className={filaResumen}>
                <View className="flex-row items-center">
                  <Ionicons name="heart" size={20} color={colores.textoSobreOscuro} />
                  <Text className="text-chido-texto-secundario-sobre-oscuro font-bold text-lg ml-1.5">
                    Propina ({cuenta.propinaPorcentaje}%):
                  </Text>
                </View>
                <Text className="text-chido-texto-sobre-oscuro font-black text-xl">
                  +${cuenta.propinaMonto.toLocaleString('es-AR')}
                </Text>
              </View>

              <Text className="text-chido-texto-secundario-sobre-oscuro text-sm font-semibold mt-0.5">
                Servicio: {SATISFACCION_LABEL[cuenta.propinaPorcentaje ?? 0]}
              </Text>
            </View>

            {/* Total a pagar */}
            <View className={`border-t-2 border-white/20 ${compacto ? 'pt-2' : 'pt-3'} flex-row justify-between items-baseline`}>
              <View>
                <Text className="text-chido-texto-secundario-sobre-oscuro font-extrabold text-base uppercase tracking-wider">
                  TOTAL A PAGAR
                </Text>
                <Text className="text-chido-texto-secundario-sobre-oscuro/80 text-sm">
                  Impuestos y propina incluidos
                </Text>
              </View>
              <Text className={`text-chido-texto-sobre-oscuro font-black ${compacto ? 'text-4xl' : 'text-5xl'}`}>
                ${cuenta.totalFinal.toLocaleString('es-AR')}
              </Text>
            </View>
          </View>

          {/* 3. Botón para pagar o Estado acreditado */}
          {pagoInformado ? (
            <View key="banner-pago-informado" className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${compacto ? 'p-3' : 'p-4'} items-center shadow-lg`}>
              <View className="flex-row items-center mb-1">
                <Ionicons name="checkmark-circle" size={34} color={colores.activo} />
                <Text className="text-chido-texto-sobre-oscuro font-black text-2xl ml-2">
                  Pago informado
                </Text>
              </View>
              <ChidoLoader compacto mensaje="Aguardando confirmación del mozo…" />
            </View>
          ) : (
            <TouchableOpacity
              key="boton-realizar-pago"
              accessibilityRole="button"
              accessibilityLabel="Pagar cuenta"
              disabled={procesandoPago}
              className={`rounded-2xl border-2 border-white/70 bg-chido-cabecera ${compacto ? 'py-4' : 'py-5'} px-6 flex-row items-center justify-center shadow-lg active:opacity-90`}
              onPress={handleRealizarPago}
            >
              {procesandoPago ? (
                <ChidoLoader compacto mensaje="Informando pago…" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="card-outline" size={36} color={colores.textoSobreOscuro} />
                  <Text className="text-chido-texto-sobre-oscuro font-black text-3xl ml-3">
                    Pagar ${cuenta.totalFinal.toLocaleString('es-AR')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* MODAL SCANNER QR PROPINA */}
      <QRScanner
        visible={scannerVisible}
        proposito="propina"
        onScan={handleEscaneoQr}
        onClose={() => setScannerVisible(false)}
      />

      <ResultadoModal
        visible={Boolean(aviso)}
        tipo="error"
        titulo={aviso?.titulo ?? ''}
        mensaje={aviso?.mensaje ?? ''}
        accion="Entendido"
        onClose={() => setAviso(null)}
      />

      <ResultadoModal
        visible={pagoConfirmadoVisible}
        tipo="exito"
        titulo="¡Pago confirmado!"
        mensaje="El mozo confirmó tu pago. ¡Muchas gracias por tu visita!"
        accion="Aceptar"
        onClose={() => void handleConfirmacionPago()}
      />
    </View>
  );
}
