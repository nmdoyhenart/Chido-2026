import { Image, Text, View } from 'react-native';

type EstadoVacioProps = {
  mensaje?: string;
  compacto?: boolean;
};

export function EstadoVacio({ mensaje = 'Nada para mostrar', compacto = false }: EstadoVacioProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-8" style={compacto ? undefined : { transform: [{ translateY: -96 }] }}>
      <Image
        source={require('../../../assets/images/mascota-pensando.png')}
        resizeMode="contain"
        style={{ width: compacto ? 150 : 390, height: compacto ? 150 : 390 }}
        accessibilityLabel="Mascota esperando contenido"
      />
      <Text className={`${compacto ? 'mt-3 text-xl' : 'mt-7 text-5xl'} text-center font-extrabold text-chido-texto-sobre-oscuro`}>{mensaje}</Text>
    </View>
  );
}
