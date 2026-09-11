import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { setAudioModeAsync, setIsAudioActiveAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import Animated, {
  BounceIn,
  FadeInDown,
} from 'react-native-reanimated';

import TacoSpinner from '../components/ui/TacoSpinner';

export default function SplashScreenAnimado() {
  const router = useRouter();

  const player = useAudioPlayer(
    require('../../assets/sounds/splash.mp3'),
    { downloadFirst: true, updateInterval: 100 }
  );
  const estadoAudio = useAudioPlayerStatus(player);
  const [audioPreparado, setAudioPreparado] = useState(false);
  const [animacionTerminada, setAnimacionTerminada] = useState(false);
  const [sonidoTerminado, setSonidoTerminado] = useState(false);
  const [esperaAgotada, setEsperaAgotada] = useState(false);
  const [falloAudio, setFalloAudio] = useState(false);
  const reproduccionIniciada = useRef(false);
  const navegando = useRef(false);

  useEffect(() => {
    let activo = true;
    async function prepararAudio() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
        });
        if (!activo) return;
        await setIsAudioActiveAsync(true);
        if (activo) setAudioPreparado(true);
      } catch (error) {
        if (activo) {
          console.warn('SPLASH_AUDIO_CONFIGURACION', error);
          setFalloAudio(true);
        }
      }
    }
    void prepararAudio();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const minimo = setTimeout(() => setAnimacionTerminada(true), 4500);
    // El archivo puede tardar en llegar desde Metro en Expo Go. Una falla
    // de carga no debe dejar al usuario atrapado en la pantalla inicial.
    const maximo = setTimeout(() => setEsperaAgotada(true), 10000);
    return () => { clearTimeout(minimo); clearTimeout(maximo); };
  }, []);

  useEffect(() => {
    if (!audioPreparado || !estadoAudio.isLoaded || falloAudio || esperaAgotada || reproduccionIniciada.current) return;
    reproduccionIniciada.current = true;
    try {
      player.volume = 1;
      player.muted = false;
      player.loop = false;
      player.play();
    } catch (error) {
      console.warn('SPLASH_AUDIO_REPRODUCCION', error);
      setFalloAudio(true);
    }
  }, [audioPreparado, estadoAudio.isLoaded, falloAudio, esperaAgotada, player]);

  useEffect(() => {
    if (estadoAudio.didJustFinish) setSonidoTerminado(true);
    if (estadoAudio.error) {
      console.warn('SPLASH_AUDIO_ARCHIVO', estadoAudio.error);
      setFalloAudio(true);
    }
  }, [estadoAudio.didJustFinish, estadoAudio.error]);

  useEffect(() => {
    if (!animacionTerminada || (!sonidoTerminado && !falloAudio && !esperaAgotada) || navegando.current) return;
    navegando.current = true;
    if (esperaAgotada && !sonidoTerminado && !falloAudio) console.warn('SPLASH_AUDIO_TIEMPO_AGOTADO');
    // useAudioPlayer libera el reproductor al desmontar esta pantalla.
    router.replace('/(auth)/login');
  }, [animacionTerminada, sonidoTerminado, falloAudio, esperaAgotada, router]);

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
