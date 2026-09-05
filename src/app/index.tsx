import React, { useEffect, useState } from 'react';
import { View, Text, ImageBackground, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import TacoSpinner from '../components/ui/TacoSpinner';
import Animated, {
  BounceIn,
  FadeInDown,
} from 'react-native-reanimated';

export default function SplashScreenAnimado() {
  const router = useRouter();

  const player = useAudioPlayer(
    require('../../assets/sounds/splash.mp3')
  );

  useEffect(() => {
    player.volume = 0.25;
    player.play();

    const timer = setTimeout(() => {
      router.replace('../(auth)/login');
    }, 4500);

    return () => {
      clearTimeout(timer);
    };
  }, [player, router]);

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
              "
              style={{
                textShadowColor: 'rgba(0,0,0,0.35)',
                textShadowOffset: {
                  width: 0,
                  height: 2,
                },
                textShadowRadius: 4,
              }}
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