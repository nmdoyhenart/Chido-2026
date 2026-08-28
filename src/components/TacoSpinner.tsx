import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export default function TacoSpinner() {
  // Valor compartido que irá de 0 a 360 grados
  const rotacion = useSharedValue(0);

  useEffect(() => {
    // Iniciamos la animación lineal infinita al montar el componente
    rotacion.value = withRepeat(
      withTiming(360, { duration: 2500, easing: Easing.linear }),
      -1, // -1 significa infinito
      false // false significa que no va en reversa, siempre gira al mismo lado
    );
  }, []);

  const estiloAnimado = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotacion.value}deg` }],
    };
  });

  // Array para generar los 8 "rayos" del spinner
  const rayos = Array.from({ length: 8 });
  // Colores temáticos mexicanos para los rayos
  const colores = ['#fde047', '#f97316', '#ef4444', '#84cc16']; 

  return (
    <View className="items-center justify-center w-24 h-24">
      {/* Círculo exterior con rayos giratorios */}
      <Animated.View 
        style={[estiloAnimado, { position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }]}
      >
        {rayos.map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: 4,
              height: 12,
              backgroundColor: colores[i % colores.length],
              borderRadius: 2,
              transform: [
                { rotate: `${i * 45}deg` }, // Rota cada rayo 45 grados respecto al centro
                { translateY: -28 } // Empuja el rayo hacia afuera
              ]
            }}
          />
        ))}
      </Animated.View>

      {/* Círculo central estático con el taco */}
      <View className="w-14 h-14 bg-yellow-200/90 rounded-full items-center justify-center border-[3px] border-yellow-600 shadow-xl">
        <Text className="text-2xl">🌮</Text>
      </View>
    </View>
  );
}