import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';
import FormularioRegistroCliente from '../../components/auth/FormularioRegistroCliente';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { useAppSession } from '../../contexts/AppSessionContext';
import { registrarCliente } from '../../services/registro-cliente.service';

export default function RegistroScreen() {
  const router = useRouter();
  const { mode, role, cargando } = useAppSession();
  if (cargando) return <View className="flex-1 bg-chido-fondo justify-center"><ChidoLoader mensaje="Verificando sesión…" /></View>;
  const esMetre = mode === 'authenticated' && role === 'metre';
  if (mode === 'authenticated' && !esMetre) return <Redirect href="/(app)/home" />;
  return <FormularioRegistroCliente
    esMetre={esMetre}
    onSubmit={(datos) => registrarCliente(datos, esMetre)}
    onVolver={() => router.replace(esMetre ? '/(app)/home' : '/(auth)/login')}
  />;
}
