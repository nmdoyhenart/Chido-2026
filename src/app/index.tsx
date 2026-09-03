import React, { useEffect } from 'react';
import { View, Text, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';

import Animated, {
  BounceIn,
  FadeInDown,
} from 'react-native-reanimated';

import TacoSpinner from '../components/TacoSpinner';

export default function SplashScreenAnimado() {
  const router = useRouter();

  useEffect(() => {
    let sound: Audio.Sound | null = null;

    const reproducirSonido = async () => {
      try {
        const { sound: nuevoSonido } =
          await Audio.Sound.createAsync(
            require('../../assets/sounds/splash.mp3'),
            {
              shouldPlay: true,

              // Volumen bajo para que no moleste
              volume: 0.25,
            }
          );

        sound = nuevoSonido;
      } catch (error) {
        console.log('No se pudo reproducir el sonido del splash:', error);
      }
    };

    reproducirSonido();

    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 4500);

    return () => {
      clearTimeout(timer);

      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [router]);

  return (
    <ImageBackground
      source={require('../../assets/images/fondo.jpeg')}
      className="flex-1"
      resizeMode="cover"
      blurRadius={8}
    >
      <SafeAreaView
        className="
          flex-1
          items-center
          justify-center
          px-4
          bg-black/10
        "
      >

        {/* LOGO + NOMBRE */}
        <View className="items-center justify-center mb-14">

          <Animated.Image
            entering={BounceIn.duration(1200)}
            source={require('../../assets/images/logo.png')}
            style={{
              width: 220,
              height: 220,
              marginBottom: 16,
            }}
            resizeMode="contain"
          />

          <Animated.View
            entering={FadeInDown.delay(500).duration(800)}
            className="items-center"
          >
            <Text
              className="
                text-white
                text-6xl
                font-extrabold
                italic
                tracking-widest
                shadow-lg
                shadow-black/50
              "
            >
              Chido
            </Text>

            <Text
              className="
                text-yellow-200
                text-base
                font-bold
                tracking-[0.18em]
                mt-3
                text-center
                uppercase
              "
            >
              COMIDA MEXICANA EN SERIO
            </Text>
          </Animated.View>

        </View>

        {/* INTEGRANTES */}
        <Animated.View
          entering={FadeInDown.delay(1000).duration(800)}
          className="items-center w-full"
        >

          <Text
            className="
              text-yellow-200
              text-sm
              font-extrabold
              tracking-[0.22em]
              mb-5
              uppercase
            "
          >
            INTEGRANTES
          </Text>

          <View className="items-center gap-2.5 mb-9">

            <Text
              className="
                text-white
                text-xl
                font-medium
                text-center
              "
            >
              Laura Silvina Gauto Morales
            </Text>

            <Text
              className="
                text-white
                text-xl
                font-medium
                text-center
              "
            >
              Juan Ignacio Antunez
            </Text>

            <Text
              className="
                text-white
                text-xl
                font-medium
                text-center
              "
            >
              Emmanuel David Martín
            </Text>

            <Text
              className="
                text-white
                text-xl
                font-medium
                text-center
              "
            >
              Nicolás Doyhenart
            </Text>

          </View>

          <TacoSpinner />

        </Animated.View>

      </SafeAreaView>
    </ImageBackground>
  );
}