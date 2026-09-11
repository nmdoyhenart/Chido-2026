import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

export default function ChidoLoader({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  const giro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animacion = Animated.loop(Animated.timing(giro, {
      toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true,
    }));
    animacion.start();
    return () => animacion.stop();
  }, [giro]);
  return (
    <View className="items-center justify-center gap-3 p-5" accessibilityRole="progressbar" accessibilityLabel={mensaje}>
      <Animated.Image
        source={require('../../../assets/images/logo.png')}
        resizeMode="contain"
        style={{ width: 72, height: 72, transform: [{ rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}
      />
      <Text className="text-white text-lg font-bold text-center" accessibilityLiveRegion="polite">{mensaje}</Text>
    </View>
  );
}