import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

// Mide el alto real del contenedor (ya descontados cabecera y áreas seguras)
// para que las pantallas sin scroll ajusten tamaños y nada se superponga.
export function useAltoDisponible() {
  const [alto, setAlto] = useState(0);

  const alMedir = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    const medido = Math.round(nativeEvent.layout.height);
    setAlto((actual) => (Math.abs(actual - medido) > 1 ? medido : actual));
  }, []);

  return {
    alto,
    alMedir,
    compacto: alto > 0 && alto < 640,
    muyCompacto: alto > 0 && alto < 540,
  };
}
