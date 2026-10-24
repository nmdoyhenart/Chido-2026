import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';
import FormularioRegistroCliente from '../../components/auth/FormularioRegistroCliente';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { useAppSession } from '../../contexts/AppSessionContext';
import { registrarCliente } from '../../services/registro-cliente.service';
import { useRestriccionSimulacion } from '../../components/ui/RestriccionSimulacion';

export default function RegistroScreen() {
  const router = useRouter();
  const { mode, role, cargando } = useAppSession();
  const { bloquear, modal } = useRestriccionSimulacion();
  if (cargando) return <View className="flex-1 bg-chido-fondo justify-center"><ChidoLoader mensaje="Verificando sesión…" /></View>;
  const esMetre = (mode === 'authenticated' || mode === 'simulation') && role === 'metre';
  if (mode === 'authenticated' && !esMetre) return <Redirect href="/(app)/home" />;
  return <>{modal}<FormularioRegistroCliente
    esMetre={esMetre}
    onSubmit={async (datos) => {
      if (bloquear('registrar clientes')) return { ok: false, mensaje: 'Ingresá con una cuenta autorizada para registrar clientes.' };
      return registrarCliente(datos, esMetre);
    }}
    onVolver={() => router.dismissTo(esMetre ? '/metre/home' : '/(auth)/login')}
  /></>;
}
