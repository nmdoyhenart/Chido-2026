import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


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


 function handleScan() {
   router.push('/cliente/menu');
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