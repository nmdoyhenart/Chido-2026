import { Image, Text, View } from 'react-native';

type EstadoVacioProps = {
  mensaje?: string;
};

export function EstadoVacio({ mensaje = 'No hay nada para mostrar' }: EstadoVacioProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-8" style={{ transform: [{ translateY: -32 }] }}>
      <Image
        source={require('../../../assets/images/mascota-pensando.png')}
        resizeMode="contain"
        style={{ width: 330, height: 330 }}
        accessibilityLabel="Mascota esperando contenido"
      />
      <Text className="mt-6 text-center text-4xl font-extrabold text-chido-texto-sobre-oscuro">{mensaje}</Text>
    </View>
  );
}
