import { View } from 'react-native';
import ChidoLoader from './ChidoLoader';

type ChidoLoaderOverlayProps = {
  mensaje: string;
};

// El cargador se superpone al contenido para no alterar el tamaño de la pantalla activa.
export default function ChidoLoaderOverlay({ mensaje }: ChidoLoaderOverlayProps) {
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center bg-chido-fondo/85">
      <ChidoLoader mensaje={mensaje} />
    </View>
  );
}
