import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppSession } from '../../contexts/AppSessionContext';
import { supabase } from '../../lib/supabase';
import { Header } from '../../components/Header';
import { QRScanner } from '../../components/ui/QRScanner';
import { colores } from '../../theme/colores';
import { useAppSession } from '../../contexts/AppSessionContext';


export default function HomeCliente() {
 const router = useRouter();
 const { usuario } = useAppSession();
 const primerNombre = usuario?.nombres.trim().split(/\s+/)[0] || 'Cliente';
 const [scannerVisible, setScannerVisible] = useState(false);
 const insets = useSafeAreaInsets();
 const [altoDisponible, setAltoDisponible] = useState(0);
 const compacto = altoDisponible > 0 && altoDisponible < 620;
 const espacio = compacto ? 10 : 14;
 const tarjeta = { flexGrow: 1, flexBasis: 0, minHeight: 112, justifyContent: 'center' as const, padding: compacto ? 16 : 24 };


 const { usuario } = useAppSession();

 async function handleScan(raw: string) {
   if (!usuario) return;
   try {
     const regex = /chido:mesa:([^:]+):v1/i;
     const match = raw.match(regex);
     if (!match) {
       Alert.alert('Error', 'El código QR no corresponde a una mesa.');
       return;
     }
     const mesaId = match[1].toLowerCase();

     // Verificar si la mesa ya está ocupada por otro cliente
     const { data: mesaVerificada, error: errorVerificacion } = await supabase
       .from('mesas')
       .select('cliente_id, disponibilidad')
       .eq('id', mesaId)
       .single();

     if (errorVerificacion) {
       Alert.alert('Error', 'Mesa no encontrada.');
       return;
     }

     if (mesaVerificada.cliente_id && mesaVerificada.cliente_id !== usuario.id) {
       Alert.alert('Aviso', 'Esta mesa ya está ocupada por otro cliente.');
       setScannerVisible(false);
       return;
     }

     const { error } = await supabase
       .from('mesas')
       .update({
         cliente_id: usuario.id,
         disponibilidad: 'ocupada',
         qr_confirmado_at: new Date().toISOString()
       })
       .eq('id', mesaId);

     if (error) {
       Alert.alert('Error', 'No se pudo asignar la mesa. ' + error.message);
       setScannerVisible(false);
       return;
     }

     setScannerVisible(false);
     router.push({ pathname: '/cliente/menu', params: { mesaId } });
   } catch (e: any) {
     Alert.alert('Error', e.message);
   }
 }


 return (
   <View className="flex-1 bg-chido-fondo">
     <Header userName="Cliente" role="Bienvenido" />


     <ScrollView
       className="flex-1"
       onLayout={({ nativeEvent }) => setAltoDisponible(nativeEvent.layout.height)}
       contentContainerStyle={{ flexGrow: 1, gap: espacio, paddingHorizontal: 16, paddingTop: espacio, paddingBottom: Math.max(insets.bottom, espacio) }}
       showsVerticalScrollIndicator={false}
       bounces={false}
       overScrollMode="never"
     >
        <Text className="text-3xl font-bold text-chido-texto-sobre-oscuro" style={{ paddingVertical: compacto ? 6 : 10 }}>Hola, {primerNombre}</Text>


       <Pressable
         accessibilityRole="button"
         accessibilityLabel="Escanear código QR de la mesa"
          className="rounded-2xl border-2 border-white/70 bg-chido-cabecera"
         style={tarjeta}
         onPress={() => setScannerVisible(true)}
       >
         <View className="flex-row items-center">
             <Ionicons name="qr-code-outline" size={52} color={colores.textoSobreOscuro} />
           <View className="ml-4 flex-1">
               <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Escanear QR</Text>
           </View>
           <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
         </View>
       </Pressable>


         <View accessibilityLabel="Encuestas próximamente disponibles" className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta}>
         <View className="flex-row items-center">
             <Ionicons name="bar-chart-outline" size={52} color={colores.textoSobreOscuro} />
           <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Ver encuestas</Text>
           </View>
         </View>
       </View>


         <View accessibilityLabel="Solicitar mesa próximamente disponible" className="rounded-2xl border-2 border-white/70 bg-chido-cabecera" style={tarjeta}>
         <View className="flex-row items-center">
             <Ionicons name="people-outline" size={52} color={colores.textoSobreOscuro} />
           <View className="ml-4 flex-1">
              <Text className="font-extrabold text-chido-texto-sobre-oscuro" style={{ fontSize: 34, lineHeight: 40 }}>Solicitar mesa</Text>
           </View>
         </View>
       </View>
     </ScrollView>


     <QRScanner
       visible={scannerVisible}
       proposito="mesa"
       onScan={handleScan}
       onClose={() => setScannerVisible(false)}
     />
   </View>
 );
}
