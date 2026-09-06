// Agrupa alturas naturales; una tarjeta más alta que la pantalla queda sola.
export function agruparTarjetasPorAltura(
  alturas: readonly number[],
  alturaDisponible: number,
  separacion = 12,
): number[][] {
  if (alturaDisponible <= 0) return [];
  const paginas: number[][] = [];
  let usada = 0;
  for (const [indice, altura] of alturas.entries()) {
    const ultima = paginas[paginas.length - 1];
    if (!ultima || usada + separacion + altura > alturaDisponible) {
      paginas.push([indice]);
      usada = altura;
    } else {
      ultima.push(indice);
      usada += separacion + altura;
    }
  }
  return paginas;
}
