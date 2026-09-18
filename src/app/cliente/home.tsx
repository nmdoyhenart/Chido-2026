import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';


import { Header } from '../../components/Header';
import { QRScanner } from '../../components/ui/QRScanner';
import { colores } from '../../theme/colores';


const CATEGORIAS_ENCUESTA = [
 { etiqueta: 'Comida', icono: 'star-outline' },
 { etiqueta: 'Atención', icono: 'people-outline' },
 { etiqueta: 'Recomendaciones', icono: 'thumbs-up-outline' },
] as const;


export default function HomeCliente() {
 const router = useRouter();
 const [scannerVisible, setScannerVisible] = useState(false);


 function handleScan() {
   router.push('/cliente/menu');
 }


 return (
   <View className="flex-1 bg-chido-fondo">
     <Header userName="Cliente" role="Bienvenido" />


     <ScrollView
       className="flex-1"
       contentContainerClassName="gap-5 px-5 pb-8 pt-5"
       showsVerticalScrollIndicator={false}
     >
       <View className="items-center rounded-3xl border-2 border-chido-acento bg-chido-cabecera/80 px-6 py-7">
         <View className="h-16 w-16 items-center justify-center rounded-2xl border-2 border-chido-acento bg-chido-fondo">
           <Ionicons name="restaurant-outline" size={34} color={colores.textoSobreOscuro} />
         </View>
         <Text className="mt-5 text-center text-sm font-extrabold uppercase tracking-wider text-chido-texto-secundario-sobre-oscuro">Cliente registrado</Text>
         <Text className="mt-2 text-center text-4xl font-extrabold text-chido-texto-sobre-oscuro">Bienvenido</Text>
         <Text className="mt-3 text-center text-lg leading-6 text-chido-texto-secundario-sobre-oscuro">Escaneá el código QR de tu mesa para conocer nuestra carta y hacer tu pedido.</Text>
       </View>


       <Pressable
         accessibilityRole="button"
         accessibilityLabel="Escanear código QR de la mesa"
         className="rounded-3xl border-2 border-chido-texto-secundario-sobre-oscuro bg-chido-acento p-5"
         onPress={() => setScannerVisible(true)}
       >
         <View className="flex-row items-center">
           <View className="h-16 w-16 items-center justify-center rounded-2xl bg-chido-cabecera">
             <Ionicons name="qr-code-outline" size={36} color={colores.textoSobreOscuro} />
           </View>
           <View className="ml-4 flex-1">
             <Text className="text-2xl font-extrabold text-chido-texto-sobre-oscuro">Escanear código QR</Text>
             <Text className="mt-1 text-base text-chido-texto-secundario-sobre-oscuro">Accedé a la carta desde tu mesa.</Text>
           </View>
           <Ionicons name="chevron-forward" size={30} color={colores.textoSobreOscuro} />
         </View>
         <View className="mt-5 flex-row rounded-2xl bg-chido-cabecera/70 p-3">
           <Text className="flex-1 text-center text-sm font-bold text-chido-texto-sobre-oscuro">1. Escaneá</Text>
           <Text className="flex-1 text-center text-sm font-bold text-chido-texto-sobre-oscuro">2. Confirmá</Text>
           <Text className="flex-1 text-center text-sm font-bold text-chido-texto-sobre-oscuro">3. Pedí</Text>
         </View>
       </Pressable>


       <View accessibilityLabel="Encuestas próximamente disponibles" className="rounded-3xl border-2 border-chido-acento bg-chido-cabecera/70 p-5">
         <View className="flex-row items-center">
           <View className="h-14 w-14 items-center justify-center rounded-2xl bg-chido-acento">
             <Ionicons name="bar-chart-outline" size={30} color={colores.textoSobreOscuro} />
           </View>
           <View className="ml-4 flex-1">
             <Text className="text-2xl font-extrabold text-chido-texto-sobre-oscuro">Ver encuestas</Text>
             <Text className="mt-1 text-base text-chido-texto-secundario-sobre-oscuro">Opiniones y promedios.</Text>
           </View>
         </View>
         <View className="mt-5 flex-row gap-2">
           {CATEGORIAS_ENCUESTA.map((categoria) => (
             <View key={categoria.etiqueta} className="min-h-24 flex-1 items-center justify-center rounded-2xl bg-chido-acento px-2 py-3">
               <Ionicons name={categoria.icono} size={25} color={colores.textoSobreOscuro} />
               <Text className="mt-2 text-center text-sm font-bold text-chido-texto-sobre-oscuro">{categoria.etiqueta}</Text>
             </View>
           ))}
         </View>
         <Text className="mt-4 text-center text-sm font-bold text-chido-texto-secundario-sobre-oscuro">Próximamente</Text>
       </View>


       <View accessibilityLabel="Solicitar mesa próximamente disponible" className="rounded-3xl border-2 border-chido-acento bg-chido-acento p-5">
         <View className="flex-row items-center">
           <View className="h-14 w-14 items-center justify-center rounded-2xl bg-chido-cabecera">
             <Ionicons name="people-outline" size={30} color={colores.textoSobreOscuro} />
           </View>
           <View className="ml-4 flex-1">
             <Text className="text-2xl font-extrabold text-chido-texto-sobre-oscuro">Solicitar mesa</Text>
             <Text className="mt-1 text-base text-chido-texto-secundario-sobre-oscuro">Esta opción estará disponible próximamente.</Text>
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



