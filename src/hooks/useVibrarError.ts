import { useEffect } from 'react';
import { vibrarError } from '../utils/errorVibration';

export function useVibrarError(error: string | null | undefined) {
  useEffect(() => {
    if (error) vibrarError();
  }, [error]);
}
