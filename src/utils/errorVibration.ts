import { Vibration } from 'react-native';

let ultimaVibracionError = 0;

export function vibrarError() {
  const ahora = Date.now();
  if (ahora - ultimaVibracionError < 500) return;
  ultimaVibracionError = ahora;
  Vibration.vibrate(180);
}
