import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { getMesasMozo } from '../../services/mesas';
import { Mesa } from '../../types/mesa';
import { useAppSession } from '../../contexts/AppSessionContext';

const ITEM_HEIGHT = 140;
const ITEM_MARGIN = 16;

export default function ListaChatsMozo() {
  const router = useRouter();
  const { usuario, role } = useAppSession();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMesas = async () => {
      try {
        const data = await getMesasMozo();
        if (data) setMesas(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMesas();
  }, []);

  const userName = usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Mozo";
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Mozo";

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName={userName} role={`${displayRole} - Consultas`} />
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={mesas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={ITEM_HEIGHT + ITEM_MARGIN}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="p-5 bg-chido-cabecera border-2 border-white/70 rounded-2xl flex-row justify-between items-center"
              style={{ height: ITEM_HEIGHT, marginBottom: ITEM_MARGIN }}
              onPress={() => router.push({ pathname: '/mozo/chat-mesa', params: { mesaId: item.id, numero: item.numero } })}
            >
              <View className="flex-1">
                <Text className="text-chido-texto-sobre-oscuro text-2xl font-bold mb-1">Mesa {item.numero}</Text>
                <Text className="text-chido-texto-secundario-sobre-oscuro text-base capitalize">
                  Tipo: {item.tipo} • {item.cantidad_comensales} comensales
                </Text>
                <View className="flex-row items-center mt-3">
                  <View className={`w-3 h-3 rounded-full mr-2 ${item.disponibilidad === 'ocupada' ? 'bg-chido-error' : 'bg-chido-exito'}`} />
                  <Text className="text-chido-texto-sobre-oscuro font-bold capitalize">{item.disponibilidad}</Text>
                </View>
              </View>
              <View className="bg-chido-acento p-3 rounded-xl border border-white/30">
                <Text className="text-chido-texto-sobre-oscuro font-bold">Ver Chat</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text className="text-chido-texto-sobre-oscuro text-center mt-10 text-lg">No hay mesas activas con chats.</Text>
          }
        />
      )}
    </View>
  );
}
