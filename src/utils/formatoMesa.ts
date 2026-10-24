export function formatearTipoMesa(tipo: string | null | undefined): string {
  if (!tipo) return '';
  const normalizado = tipo.toLowerCase().trim();
  if (normalizado === 'vip') return 'VIP';
  if (normalizado.includes('movilidad') || normalizado === 'prm') return 'PRM';
  if (normalizado.includes('estandar') || normalizado.includes('estándar')) return 'Estándar';
  return tipo;
}

export function formatearRolMesa(
  numero: number | string | null | undefined,
  tipo: string | null | undefined,
  fallback: string = 'Mesa'
): string {
  if (numero === null || numero === undefined || numero === '') return fallback;
  const tipoFormateado = formatearTipoMesa(tipo);
  return tipoFormateado ? `Mesa ${numero} - ${tipoFormateado}` : `Mesa ${numero}`;
}

