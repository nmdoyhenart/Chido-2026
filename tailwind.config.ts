import { colores } from "./src/theme/colores";

/** @type {import('tailwindcss').Config} */
module.exports = {
    // Toma todo lo que esta dentro de la carpeta src
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // NativeWind publica este preset como CommonJS.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        chido: {
          fondo: colores.fondo,
          cabecera: colores.cabecera,
          acento: colores.acento,
          "texto-sobre-oscuro": colores.textoSobreOscuro,
          "texto-secundario-sobre-oscuro": colores.textoSecundarioSobreOscuro,
          "texto-secundario-alternativo": colores.textoSecundarioAlternativo,
          superficie: colores.superficie,
          "texto-sobre-claro": colores.textoSobreClaro,
          "texto-secundario-sobre-claro": colores.textoSecundarioSobreClaro,
          "texto-boton-outline": colores.textoBotonOutline,
          activo: colores.activo,
          notificacion: colores.notificacion,
          aviso: colores.aviso,
          exito: colores.exito,
          error: colores.error,
        },
      },
    },
  },
  plugins: [],
};
