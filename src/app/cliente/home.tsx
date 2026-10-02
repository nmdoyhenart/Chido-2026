import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { Header } from '../../components/Header';
import { QRScanner } from '../../components/ui/QRScanner';
import { colores } from '../../theme/colores';
import { confirmarMesaPorQr, ingresarALaListaDeEspera } from '../../services/mesas';
import { useAppSession } from '../../contexts/AppSessionContext';
import { useAppSession } from '../../contexts/AppSessionContext';
import ChidoLoader from '../../components/ui/ChidoLoader';
import { solicitarMesa } from '../../services/mesas';


export default function HomeCliente() {
 const router = useRouter();
 const { usuario } = useAppSession();
 const [scannerVisible, setScannerVisible] = useState(false);
 const [scannerProposito, setScannerProposito] = useState<'ingreso' | 'mesa'>('mesa');


 async function handleScan(rawQr: string) {
   if (!usuario?.id) throw new Error('Iniciá sesión con tu cuenta de cliente para confirmar la mesa.');
   if (scannerProposito === 'ingreso') {
     await ingresarALaListaDeEspera(usuario.id, rawQr);
     router.push('/cliente/espera' as Href);
     return;
   }
   const mesa = await confirmarMesaPorQr(usuario.id, rawQr);
   router.push({ pathname: '/cliente/menu', params: { mesaId: mesa.id } });
 }

  async function solicitarUnaMesa() {
    if (!usuario?.id) {
      setAvisoMesa('No pudimos identificar tu cuenta para solicitar una mesa.');
      Vibration.vibrate(180);
      return;
    }
    setSolicitandoMesa(true);
    setAvisoMesa(null);
    try {
      await solicitarMesa(usuario);
      router.push('/cliente/espera-mesa');
    } catch (error) {
      setAvisoMesa(error instanceof Error ? error.message : 'No se pudo enviar la solicitud de mesa.');
      Vibration.vibrate(180);
    } finally {
      setSolicitandoMesa(false);
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
         onPress={() => { setScannerProposito('mesa'); setScannerVisible(true); }}
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


       <Pressable accessibilityRole="button" accessibilityLabel="Anotarme en la lista de espera" onPress={() => { setScannerProposito('ingreso'); setScannerVisible(true); }} className="rounded-3xl border-2 border-chido-texto-secundario-sobre-oscuro bg-chido-cabecera p-5">
         <View className="flex-row items-center">
           <View className="h-14 w-14 items-center justify-center rounded-2xl bg-chido-cabecera">
             <Ionicons name="people-outline" size={30} color={colores.textoSobreOscuro} />
           </View>
           <View className="ml-4 flex-1">
           <Text className="text-2xl font-extrabold text-chido-texto-sobre-oscuro">Lista de espera</Text>
           <Text className="mt-1 text-base text-chido-texto-secundario-sobre-oscuro">Escaneá el QR de ingreso para que el metre pueda asignarte una mesa.</Text>
           </View>
         </View>
         <View className="mt-5 flex-row items-center">
           {['Solicitás', 'Esperás', 'Confirmás'].map((paso, indice) => (
             <React.Fragment key={paso}>
               {indice > 0 && <View className="mx-2 h-1 flex-1 bg-chido-cabecera" />}
               <View className="items-center">
                 <View className="h-10 w-10 items-center justify-center rounded-xl bg-chido-cabecera">
                   <Text className="text-lg font-extrabold text-chido-texto-sobre-oscuro">{indice + 1}</Text>
                 </View>
                 <Text className="mt-2 text-center text-xs font-bold text-chido-texto-sobre-oscuro">{paso}</Text>
               </View>
             </React.Fragment>
           ))}
         </View>
       </Pressable>
     </ScrollView>


     <QRScanner
       visible={scannerVisible}
       proposito={scannerProposito}
       onScan={handleScan}
       onClose={() => setScannerVisible(false)}
     />
   </View>
 );
}