import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../Header';
import { colores } from '../../theme/colores';
import { supabase } from '../../../lib/supabase';
import { getEstadisticasPedidos } from '../../services/pedidos.service';

export default function InicioMozo({ usuario, role }: any) {
  const router = useRouter();
  const [stats, setStats] = useState({ pendientes: 0, confirmados: 0, ultimo: '' });
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getEstadisticasPedidos();
        if (data) {
          const pendientes = data.filter((p: any) => p.estado === 'pendiente_mozo').length;
          const confirmados = data.filter((p: any) => p.estado === 'confirmado').length;
          const ultimo = data.length > 0 ? new Date(data[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ninguno';
          setStats({ pendientes, confirmados, ultimo });
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const userName = usuario ? usuario.nombres + ' ' + usuario.apellidos : 'Mozo';
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Mozo';

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={userName} role={displayRole} />

      <View className="flex-1 p-5 pt-6">
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro mb-6">
          Hola, {usuario?.nombres || 'Mozo'}
        </Text>

        <View className="flex-1 gap-4 mb-4">
          <TouchableOpacity 
            onPress={() => router.push('/mozo/pedidos')}
            className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row px-6"
          >
            <Ionicons name="restaurant-outline" size={36} color={colores.textoSobreOscuro} className="mr-4" />
            <View className="flex-1 ml-4">
              <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl">Gestión de Pedidos</Text>
              <Text className="text-chido-texto-secundario-sobre-oscuro text-base mt-1">
                {stats.pendientes} pendientes • {stats.confirmados} confirmados
              </Text>
              <Text className="text-chido-texto-secundario-sobre-oscuro text-sm mt-1 font-bold">
                Último pedido: {stats.ultimo}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={28} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/mozo/chats')}
            className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row px-6"
          >
            <Ionicons name="chatbubbles-outline" size={36} color={colores.textoSobreOscuro} className="mr-4" />
            <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl flex-1 ml-4">Consultas de Mesas</Text>
            <Ionicons name="chevron-forward" size={28} color={colores.textoSobreOscuro} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => { Alert.alert('Próximamente', 'Cobro y liberación de mesas') }}
            className="flex-1 bg-chido-cabecera border-2 border-white/70 rounded-2xl justify-center items-center flex-row px-6 opacity-70"
          >
            <Ionicons name="cash-outline" size={36} color={colores.textoSobreOscuro} className="mr-4" />
            <Text className="text-chido-texto-sobre-oscuro font-bold text-2xl flex-1 ml-4">Cobros y Liberar Mesa</Text>
            <Ionicons name="lock-closed-outline" size={24} color={colores.textoSobreOscuro} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
