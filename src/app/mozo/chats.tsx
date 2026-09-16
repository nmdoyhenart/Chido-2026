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
    <View className="flex-1 bg-[#d97736]">
      <Header userName="Mozo" role="Consultas de Mesas" />
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={mesas}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="p-4 bg-[#b35e25] mb-4 rounded-xl flex-row justify-between items-center"
              onPress={() => router.push({ pathname: '/mozo/chat-mesa', params: { mesaId: item.id, numero: item.numero } })}
            >
              <Text className="text-white text-xl font-bold">Mesa {item.numero}</Text>
              <Text className="text-[#e2b99f]">Ver chat</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

