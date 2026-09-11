import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useAppSession } from '../../contexts/AppSessionContext';
import ChidoLoader from '../../components/ui/ChidoLoader';

export default function AppLayout() {
  const { cargando, role } = useAppSession();
  if (cargando) return <View className="flex-1 bg-orange-700 justify-center"><ChidoLoader mensaje="Verificando acceso…" /></View>;
  if (!role) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
