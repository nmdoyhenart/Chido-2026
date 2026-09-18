import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/ui/Buttons';
import { QRScanner } from '../../components/ui/QRScanner';
import { parseQrPayload } from '../../utils/qr';
import { useAppSession } from '../../contexts/AppSessionContext';
import { asignarClienteAMesa, obtenerMesaAsignada } from '../../services/mesas';

export default function HomeCliente() {
  const router = useRouter();
  const { usuario } = useAppSession();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTable = async () => {
      if (usuario) {
        try {
          const mesa = await obtenerMesaAsignada(usuario.id);
          if (mesa) {
            router.replace({ pathname: '/cliente/menu', params: { mesaId: mesa.id } });
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    };
    checkTable();
  }, [usuario]);

  const handleScan = async (raw: string) => {
    if (!usuario) return;
    const payload = parseQrPayload(raw);
    if (payload?.tipo === 'mesa') {
      try {
        setLoading(true);
        setScannerVisible(false);
        await asignarClienteAMesa(payload.mesaId, usuario.id);
        router.push({ pathname: '/cliente/menu', params: { mesaId: payload.mesaId } });
      } catch (e: any) {
        setLoading(false);
        Alert.alert('Error', e.message || 'No se pudo asignar la mesa.');
      }
    } else {
      Alert.alert('Error', 'El código escaneado no pertenece a una mesa.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-chido-fondo justify-center items-center">
        <ActivityIndicator size="large" color="#FF8A00" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-chido-fondo">
      <Header userName="Cliente" role="Bienvenido" />

      <View className="flex-1 p-5 justify-center items-center">
        <Text className="text-4xl font-extrabold text-chido-texto-sobre-oscuro mb-4 text-center" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
          ¡Bienvenido a Chido!
        </Text>

        <Text className="text-chido-texto-sobre-oscuro text-lg mb-10 text-center font-medium px-4">
          Para ver nuestra carta y realizar tu pedido, por favor escaneá el código QR ubicado en tu mesa.
        </Text>
        
        <View className="w-full mb-6">
          <PrimaryButton 
            title="Escanear QR de la mesa"
            onPress={() => setScannerVisible(true)}
          />
        </View>
      </View>

      <QRScanner 
        visible={scannerVisible}
        proposito="mesa"
        onScan={handleScan}
        onClose={() => setScannerVisible(false)}
      />
    </View>
  );
}

