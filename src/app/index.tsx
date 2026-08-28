import React, { useEffect } from 'react';
import { View, Text, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { BounceIn, FadeInDown } from 'react-native-reanimated';
import TacoSpinner from '../components/TacoSpinner';

export default function SplashScreenAnimado() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login'); 
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/images/fondo.jpeg')}
      className="flex-1"
      resizeMode="cover"
      blurRadius={8}
    >
      {/* Cambiamos justify-between por justify-center para que no se separen infinitamente */}
      <SafeAreaView className="flex-1 items-center justify-center px-4 bg-black/10"> 
        
        {/* SECCIÓN SUPERIOR: Logo y Título */}
        <View className="items-center justify-center mb-16">
          <Animated.Image
            entering={BounceIn.duration(1200)}
            source={require('../../assets/images/logo.png')}
            style={{ width: 220, height: 220, marginBottom: 16 }}
            resizeMode="contain"
          />
          
          <Animated.View entering={FadeInDown.delay(500).duration(800)} className="items-center">
            <Text className="text-white text-6xl font-extrabold italic tracking-widest shadow-lg shadow-black/50">
              Chido
            </Text>
            <Text className="text-yellow-200 text-xs font-bold tracking-[0.2em] mt-3 text-center opacity-90 uppercase">
              COMIDA MEXICANA EN SERIO
            </Text>
          </Animated.View>
        </View>

        {/* SECCIÓN INFERIOR: Integrantes y el TacoSpinner */}
        <Animated.View 
          entering={FadeInDown.delay(1000).duration(800)} 
          className="items-center w-full"
        >

          <Text className="text-yellow-200 text-xs font-bold tracking-[0.2em] mb-5 opacity-90 uppercase">
            INTEGRANTES
          </Text>
          
          <View className="items-center space-y-2.5 mb-10">
            <Text className="text-white text-lg font-medium shadow-sm">Laura Silvina Gauto Morales</Text>
            <Text className="text-white text-lg font-medium shadow-sm">Juan Ignacio Antunez</Text>
            <Text className="text-white text-lg font-medium shadow-sm">Emmanuel David Martín</Text>
            <Text className="text-white text-lg font-medium shadow-sm">Nicolás Doyhenart</Text>
          </View>

          <TacoSpinner/>
        </Animated.View>

      </SafeAreaView>
    </ImageBackground>
  );
}