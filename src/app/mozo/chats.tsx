import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { supabase } from '../../../lib/supabase';
import { Mesa } from '../../types/mesa';

export default function ListaChatsMozo() {
  const router = useRouter();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMesas = async () => {
      const { data } = await supabase.from('mesas').select('*').order('numero', { ascending: true });
      if (data) setMesas(data);
      setLoading(false);
    };
    fetchMesas();
  }, []);

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Mozo" role="Consultas de Mesas" />
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={mesas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="p-4 bg-chido-cabecera border-2 border-white/70 mb-4 rounded-2xl flex-row justify-between items-center"
              onPress={() => router.push({ pathname: '/mozo/chat-mesa', params: { mesaId: item.id, numero: item.numero } })}
            >
              <Text className="text-chido-texto-sobre-oscuro text-xl font-bold">Mesa {item.numero}</Text>
              <Text className="text-chido-texto-secundario-sobre-oscuro">Ver chat</Text>
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
