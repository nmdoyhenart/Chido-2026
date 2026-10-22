import { useCallback, useState } from 'react';
import { Vibration } from 'react-native';
import { ResultadoModal } from '../components/ui/ResultadoModal';

type AvisoResultado = {
  titulo: string;
  mensaje: string;
  tipo: 'error' | 'exito';
};

export function useAvisoResultado() {
  const [aviso, setAviso] = useState<AvisoResultado | null>(null);

  const mostrarAviso = useCallback((titulo: string, mensaje: string, tipo: AvisoResultado['tipo'] = 'error') => {
    if (tipo === 'error') Vibration.vibrate(180);
    setAviso({ titulo, mensaje, tipo });
  }, []);

  const modalAviso = aviso ? (
    <ResultadoModal
      visible
      tipo={aviso.tipo}
      titulo={aviso.titulo}
      mensaje={aviso.mensaje}
      accion="Entendido"
      onClose={() => setAviso(null)}
    />
  ) : null;

  return { mostrarAviso, modalAviso };
}
