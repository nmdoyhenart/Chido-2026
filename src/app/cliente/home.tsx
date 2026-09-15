import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { PrimaryButton } from '../../components/ui/Buttons';
import { QRScanner } from '../../components/ui/QRScanner';

export default function HomeCliente() {
  const router = useRouter();
  const [scannerVisible, setScannerVisible] = useState(false);

  const handleScan = async (raw: string) => {
    // raw representaría el código de la mesa, ej. un JSON o ID
    // Se asume que el escaneo es exitoso y se redirige a la carta
    router.push('/cliente/menu');
  };

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

