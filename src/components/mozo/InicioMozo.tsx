import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../Header';
import { colores } from '../../theme/colores';
import { supabase } from '../../../lib/supabase';
import { getPedidosMozo } from '../../services/pedidos.service';

export default function InicioMozo({ usuario, role }: any) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({ pendientes: 0, confirmados: 0, listos: 0, ultimo: '' });
  const [altoTarjeta, setAltoTarjeta] = useState(0);
  const [altoConsulta, setAltoConsulta] = useState(0);
  const escalaTarjeta = altoTarjeta > 0 ? Math.min(1.8, Math.max(1, altoTarjeta / 220)) : 1;
  const iconoTarjeta = Math.round(36 * escalaTarjeta);
  const tituloTarjeta = Math.round(24 * escalaTarjeta);
  const textoSecundario = Math.round(14 * escalaTarjeta);
  const textoResumen = Math.min(16, Math.max(13, Math.round(textoSecundario * 0.95)));
  const rellenoTarjeta = Math.round(24 * escalaTarjeta);
  const escalaConsulta = altoConsulta > 0 ? Math.min(2.05, Math.max(1, altoConsulta / 230)) : 1;
  const iconoConsulta = Math.round(42 * escalaConsulta);
  const tituloConsulta = Math.round(28 * escalaConsulta);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getPedidosMozo();
        if (data) {
          const pendientes = data.filter((p: any) => p.estado === 'pendiente_mozo').length;
          const confirmados = data.filter((p: any) => p.estado === 'confirmado').length;
          const listos = data.filter((p: any) => p.estado === 'en_preparacion'
            && p.pedido_detalles?.length > 0
            && p.pedido_detalles.every((detalle: { estado_sector: string }) => detalle.estado_sector === 'listo')).length;
          const ultimo = data.length > 0 ? new Date(data[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ninguno';
          setStats({ pendientes, confirmados, listos, ultimo });
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchStats();
    
    // Cada montaje necesita un canal nuevo. El mismo nombre fijo puede devolver
    // un canal que aún está suscrito durante los cambios/remontajes de sesión.
    const nombreCanal = `pedidos_stats_mozo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(nombreCanal)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_detalles' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const userName = usuario ? usuario.nombres + ' ' + usuario.apellidos : 'Mozo';
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Mozo';
  const resumenPedidos = [
    { etiqueta: 'Pendientes', cantidad: stats.pendientes, color: colores.aviso },
    { etiqueta: 'Confirmados', cantidad: stats.confirmados, color: colores.acento },
    { etiqueta: 'Listo entrega', cantidad: stats.listos, color: colores.exito },
  ];

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={userName} role={displayRole} />

      <View className="flex-1 p-5 pt-6" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro mb-6">
          Hola, {usuario?.nombres || 'Mozo'}
        </Text>

        <View className="flex-1 gap-4 mb-4">
          <TouchableOpacity 
            onPress={() => router.push('/mozo/pedidos')}
            className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row"
            onLayout={({ nativeEvent }) => setAltoTarjeta(Math.round(nativeEvent.layout.height))}
            style={{ paddingHorizontal: rellenoTarjeta }}
          >
            <Ionicons name="restaurant-outline" size={iconoTarjeta} color={colores.textoSobreOscuro} />
            <View className="flex-1 ml-4">
              <Text className="font-bold text-chido-texto-sobre-oscuro" style={{ fontSize: tituloTarjeta, lineHeight: Math.round(tituloTarjeta * 1.18) }}>Gestión de Pedidos</Text>
              <View className="mt-3 gap-1.5">
                {resumenPedidos.map((item) => <View key={item.etiqueta} className="flex-row items-center justify-between rounded-xl border border-white/20 bg-black/10 px-3 py-1.5">
                  <View className="min-w-0 flex-1 flex-row items-center">
                    <View className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <Text numberOfLines={1} className="flex-1 text-chido-texto-secundario-sobre-oscuro" style={{ fontSize: textoResumen }}>{item.etiqueta}</Text>
                  </View>
                  <View className="ml-2 min-w-8 items-center rounded-full px-2 py-0.5" style={{ backgroundColor: `${item.color}35` }}>
                    <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: textoResumen }}>{item.cantidad}</Text>
                  </View>
                </View>)}
              </View>
              <Text className="mt-2 font-bold text-chido-texto-secundario-sobre-oscuro" style={{ fontSize: textoSecundario, lineHeight: Math.round(textoSecundario * 1.25) }}>
                Último pedido: {stats.ultimo}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={Math.round(28 * escalaTarjeta)} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/mozo/chats')}
            className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row"
            onLayout={({ nativeEvent }) => setAltoConsulta(Math.round(nativeEvent.layout.height))}
            style={{ paddingHorizontal: rellenoTarjeta }}
          >
            <Ionicons name="chatbubbles-outline" size={iconoConsulta} color={colores.textoSobreOscuro} />
            <Text className="ml-5 flex-1 font-bold text-chido-texto-sobre-oscuro" style={{ fontSize: tituloConsulta, lineHeight: Math.round(tituloConsulta * 1.16) }}>Consultas de Mesas</Text>
            <Ionicons name="chevron-forward" size={Math.round(32 * escalaConsulta)} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
