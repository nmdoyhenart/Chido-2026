import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../Header';
import { useAppSession } from '../../contexts/AppSessionContext';
import { getPedidosSector } from '../../services/pedidos.service';
import { colores } from '../../theme/colores';
import { supabase } from '../../lib/supabase';

type Props = {
  usuario?: { nombres?: string | null; apellidos?: string | null } | null;
  role?: string | null;
};

export default function InicioCocinero({ usuario, role }: Props) {
  const router = useRouter();
  const { mode } = useAppSession();
  const [pedidos, setPedidos] = useState(0);

  const cargarPedidos = useCallback(async () => {
    try {
      setPedidos((await getPedidosSector('plato')).length);
    } catch (error) {
      console.warn('No se pudo actualizar el contador de pedidos de cocina.', error);
    }
  }, []);

  useEffect(() => {
    if (mode === 'simulation') {
      setPedidos(4);
      return;
    }
    cargarPedidos();
    const nombreCanal = `home_cocinero_pedidos_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(nombreCanal)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, cargarPedidos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_detalles' }, cargarPedidos)
      .subscribe();
    const intervalo = setInterval(cargarPedidos, 15000);
    return () => {
      clearInterval(intervalo);
      void supabase.removeChannel(channel);
    };
  }, [cargarPedidos, mode]);

  const nombre = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ').trim() || 'Cocinero';
  const saludo = usuario?.nombres?.trim().split(/\s+/)[0] || 'Cocinero';
  const etiquetaRol = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Cocinero';
  const opciones = [
    { titulo: 'Alta de plato', icono: 'restaurant-outline' as const, destino: '/productos/alta' as const },
    { titulo: 'Pedidos entrantes en cocina', icono: 'file-tray-full-outline' as const, destino: '/cocina/pedidos' as const, cantidad: pedidos },
    { titulo: 'Ver / gestionar la carta', icono: 'book-outline' as const, destino: '/cocina/carta' as const },
  ];

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={nombre} role={etiquetaRol} />
      <View className="flex-1 px-5 pt-6 pb-5">
        <Text className="mb-5 text-3xl font-extrabold text-chido-texto-sobre-oscuro">Hola, {saludo}</Text>
        <View className="flex-1 gap-4">
          {opciones.map(opcion => (
            <TouchableOpacity
              key={opcion.titulo}
              accessibilityRole="button"
              accessibilityLabel={opcion.titulo}
              activeOpacity={0.85}
              onPress={() => router.push(opcion.destino)}
              className="min-h-0 flex-1 flex-row items-center rounded-[28px] border-2 border-white/30 bg-chido-superficieTerracota px-5"
            >
              <View className="mr-5 h-[76px] w-[76px] items-center justify-center rounded-[22px] bg-chido-cabecera">
                <Ionicons name={opcion.icono} size={38} color={colores.textoSobreOscuro} />
              </View>
              <Text className="flex-1 text-2xl font-extrabold leading-8 text-chido-texto-sobre-oscuro">{opcion.titulo}</Text>
              {typeof opcion.cantidad === 'number' ? (
                <View className="ml-3 h-14 min-w-14 items-center justify-center rounded-full bg-chido-notificacion px-3">
                  <Text className="text-xl font-extrabold text-chido-texto-sobre-oscuro">{opcion.cantidad}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={26} color={colores.textoSecundarioSobreOscuro} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
