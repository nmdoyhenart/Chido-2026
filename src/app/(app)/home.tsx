import { useState } from 'react';
import { Vibration } from 'react-native';
import { useRouter, Redirect } from 'expo-router';


import { useAppSession } from '../../contexts/AppSessionContext';
import ChidoLoader from '../../components/ui/ChidoLoader';
import InicioDueno from '../../components/dueno/InicioDueno';
import InicioMozo from '../../components/mozo/InicioMozo';
import InicioCocinero from '../../components/cocinero/InicioCocinero';
import InicioCantinero from '../../components/cantinero/InicioCantinero';
import { ENTRADA_APP, obtenerInicioPorPerfil } from '../../utils/inicioPorPerfil';

export default function HomeScreen() {
  const router = useRouter();
  const { mode, role, usuario, cargando, cerrarSesion } = useAppSession();
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    try { await cerrarSesion(); router.replace('/(auth)/login'); }
    catch { setError('No se pudo cerrar la sesión. Revisá la conexión e intentá nuevamente.'); Vibration.vibrate(180); }
    finally { setSaliendo(false); }
  }
  if (cargando) return <ChidoLoader mensaje="Verificando acceso…" />;
  if ((mode === 'authenticated' && !usuario)
    || (mode !== 'authenticated' && mode !== 'simulation' && !(mode === 'guest' && role === 'cliente anónimo'))) {
    return <Redirect href="/(auth)/login" />;
  }
  const destino = obtenerInicioPorPerfil(role);
  if (destino !== ENTRADA_APP && role !== 'cocinero' && role !== 'cocina' && role !== 'cantinero') return <Redirect href={destino} />;

  if ((role === 'dueño' || role === 'supervisor') && (mode === 'simulation' || (mode === 'authenticated' && usuario))) {
    return <InicioDueno key={usuario?.id ?? role} simulacion={mode === 'simulation'} usuario={usuario ?? { nombres: role === 'dueño' ? 'Dueño de demostración' : 'Supervisor de demostración', apellidos: '', foto_perfil: '', perfil: role }} saliendo={saliendo} error={error} onSalir={salir} onPendientes={() => router.push('/(app)/clientes-pendientes')} />;
  }

  if (role === 'mozo' && (mode === 'simulation' || (mode === 'authenticated' && usuario))) {
    return <InicioMozo key={usuario?.id ?? role} usuario={usuario} role={role} saliendo={saliendo} onSalir={salir} />;
  }

  if (role === 'cantinero' && (mode === 'simulation' || (mode === 'authenticated' && usuario))) {
    return <InicioCantinero key={usuario?.id ?? role} usuario={usuario} role={role} />;
  }

  if ((role === 'cocinero' || role === 'cocina') && (mode === 'simulation' || (mode === 'authenticated' && usuario))) {
    return <InicioCocinero key={usuario?.id ?? role} usuario={usuario} role={role} />;
  }
  
  return <Redirect href="/(auth)/login" />;
}
