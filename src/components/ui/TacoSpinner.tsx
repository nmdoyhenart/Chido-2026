import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

export default function TacoSpinner() {
  const rotacion = useSharedValue(0);
  const escala = useSharedValue(1);

  useEffect(() => {
    // Loop giro
    rotacion.value = withRepeat(
      withTiming(360, {
        duration: 1400,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Pequeño efecto de respiración
    escala.value = withRepeat(
      withTiming(1.15, {
        duration: 700,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(rotacion);
      cancelAnimation(escala);
    };
  }, []);

  const estiloTaco = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${rotacion.value}deg`,
      },
      {
        scale: escala.value,
      },
    ],
  }));

  return (
    <View className="items-center justify-center">

      <View
        className="
          w-16 h-16
          rounded-full
          bg-yellow-200/90
          border-[3px]
          border-yellow-500
          items-center
          justify-center
          shadow-xl
        "
      >
        <Animated.View style={estiloTaco}>
          <Text className="text-3xl">🌮</Text>
        </Animated.View>
      </View>

      <Text className="mt-3 text-yellow-100 text-xs font-bold tracking-[0.2em]">
        CARGANDO...
      </Text>

    </View>
  );
}