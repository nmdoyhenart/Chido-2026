import { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase'; 

export default function PantallaDePrueba() {
  const [mensaje, setMensaje] = useState<string>('Conectando con Supabase...');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function probarConexion() {
      try {
        console.log("Iniciando petición a Supabase...");

        const { data, error, status } = await supabase
          .from('mesas')
          .select('numero, tipo'); // Pedimos campos específicos

        if (error) {
          console.error("⛔ Error de Supabase:", error);
          setMensaje(`Error ${status}: ${error.message} \nHint: ${error.hint}`);
        } else if (data) {
          console.log("✅ Datos recibidos:", data);
          setMensaje(`¡Éxito! Base conectada.\nSe encontraron ${data.length} mesas.\nEj: Mesa ${data[0]?.numero} (${data[0]?.tipo})`);
        }
      } catch (err: any) {
        console.error("⛔ Error de Javascript:", err);
        setMensaje(`Error JS: ${err.message}`);
      } finally {
        setCargando(false);
      }
    }

    probarConexion();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-zinc-900 p-4">
      <Text className="text-3xl font-bold text-green-500 mb-6 text-center">
        Diagnóstico TFI
      </Text>

      <View className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 w-full mb-6">
        {cargando ? (
          <ActivityIndicator size="large" color="#22c55e" />
        ) : (
          <Text className="text-white text-lg text-center leading-loose">
            {mensaje}
          </Text>
        )}
      </View>

      <Link href="/agregar-empleado" asChild>
        <TouchableOpacity className="bg-blue-600 px-6 py-4 rounded-xl w-full">
          <Text className="text-white text-center font-bold text-lg">Ir a Agregar Empleado (Punto 1)</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}