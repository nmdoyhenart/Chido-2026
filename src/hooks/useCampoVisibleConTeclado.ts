import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Keyboard, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView, TextInput, type TextInputProps } from 'react-native';

const MARGEN_TECLADO = 24;

export function useCampoVisibleConTeclado(scroll: RefObject<ScrollView | null>) {
  const campoEnfocado = useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput>>(null);
  const desplazamiento = useRef(0);
  const limiteTeclado = useRef<number | null>(null);
  const [rellenoInferior, setRellenoInferior] = useState(0);

  const desplazarCampoEnfocado = useCallback(() => {
    const campo = campoEnfocado.current;
    const limite = limiteTeclado.current;
    if (campo === null || campo === undefined || limite === null) return;

    campo.measureInWindow((_x, paginaY, _ancho, alto) => {
      const excedente = paginaY + alto + MARGEN_TECLADO - limite;
      if (excedente > 0) {
        scroll.current?.scrollTo({ y: desplazamiento.current + excedente, animated: true });
      }
    });
  }, [scroll]);

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', ({ endCoordinates }) => {
      limiteTeclado.current = endCoordinates.screenY;
      setRellenoInferior(endCoordinates.height + MARGEN_TECLADO);
      requestAnimationFrame(() => requestAnimationFrame(desplazarCampoEnfocado));
    });
    const ocultar = Keyboard.addListener('keyboardDidHide', () => {
      limiteTeclado.current = null;
      setRellenoInferior(0);
    });
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, [desplazarCampoEnfocado]);

  const alEnfocar: NonNullable<TextInputProps['onFocus']> = (_evento) => {
    campoEnfocado.current = TextInput.State.currentlyFocusedInput();
    requestAnimationFrame(() => desplazarCampoEnfocado());
  };

  return {
    alEnfocar,
    alDesplazar: (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
      desplazamiento.current = evento.nativeEvent.contentOffset.y;
    },
    rellenoInferior,
  };
}
