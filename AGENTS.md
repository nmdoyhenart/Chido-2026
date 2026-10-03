# Guía de Trabajo - Chido TFI 2026

## Antes de trabajar
1. Leer `context.md` y ubicar el punto funcional del PDF involucrado.
2. Ejecutar `git status --short`; el repositorio puede tener cambios de otros integrantes. No revertirlos ni sobrescribirlos.
3. Confirmar el contrato de datos con la persona responsable de Supabase antes de inventar columnas, enums o tablas.

## Estado real del repositorio
- El espacio de trabajo ya contiene splash, autenticación, inicio, alta de empleado/productos, gestión y alta de mesas y módulos QR. No asumir que una auditoría antigua refleja el estado local.
- Hay cambios locales de varios integrantes. Inspeccionar los archivos actuales antes de editar, no restaurar versiones anteriores.
- `package.json` declara Expo 57, React Native 0.86.3, React 19.2.3, TypeScript 6, Expo Router, NativeWind 4 y Supabase.
- El directorio externo de referencia está ignorado por Git. No editarlo, copiarlo ni tratarlo como código de Chido.
- `AppSessionContext` representa invitado/simulación, no un perfil autenticado. No usarlo como autorización para administrar mesas.
- Autenticación y mesas todavía usan clientes Supabase distintos. Coordinar su unificación y los controles reales con el responsable, sin inventar mapeos entre roles.

## Reglas excluyentes del TFI
- Escribir todo texto visible en español y sin abreviaturas.
- Validar todos los campos de todos los formularios.
- No usar `Alert` nativo. Usar un componente de modal/aviso de la aplicación.
- Incluir spinner con logo en toda espera asíncrona.
- Ejecutar vibración ante errores.
- No usar fondos blancos, claros, negros u oscuros ni modo oscuro. Usar colores saturados de contraste alto.
- La pantalla debe ocupar toda la superficie y su contenido no puede quedar cortado.
- Implementar QR, notificaciones y correos conforme al punto funcional correspondiente.

## Convenciones de implementación
- TypeScript estricto; definir tipos de dominio en `src/types/` antes de consumir datos sin tipo.
- Mantener las operaciones Supabase en `src/services/`; los componentes sólo manejan UI y llaman servicios/hooks.
- Reutilizar componentes UI desde `src/components/ui/` cuando exista un caso común.
- Mantener lógica de parsing y validación sin React en `src/utils/` para que pueda probarse.
- No guardar secretos en archivos versionados; usar variables `EXPO_PUBLIC_*` sólo para valores públicos.

## Estilos e integración de Mesas
- El punto funcional principal es el 4 del PDF; asignación, confirmación por QR y liberación tras pago son procesos separados.
- Reutilizar `/mesas/gestion` y `/mesas/alta`; no crear otra pantalla o tabla paralela para el mismo listado.
- Inicio tiene el acceso **Mesas**. Gestión permite agregar, consultar disponibilidad y mostrar el QR persistido; el listado se recarga al recuperar el foco.
- Para las vistas de mesas, guiarse por login, registro y splash: `fondo.jpeg`, `logo.png`, capa `bg-orange-800/35`, botones `bg-red-900` / `bg-red-900/70`, textos amarillos y bordes naranjas existentes.
- No cambiar colores de otras vistas ni crear una nueva paleta para homogeneizar este módulo. Los cambios globales de cumplimiento visual requieren coordinación.
- Usar áreas seguras, desplazamiento y manejo de teclado; no comprimir tarjetas con `flex-1` para forzar que entren en una pantalla.
- Comparar también la distribución de `altaMesa.png` y `gestionMesas.png`: tipos de mesa como botones rectangulares en fila y tarjetas compactas con QR lateral. Conservar la paleta del login; las capturas no autorizan a copiar identidades fijas ni a cambiar estilos globales.
- Mantener una salida textual fija fuera del contenido desplazable y de las esperas: gestión vuelve explícitamente a Inicio; alta vuelve a gestión. Limpiar Metro no reinicia una dirección abierta ni sustituye la navegación.
- Gestión mide las alturas naturales y agrupa tarjetas completas en páginas con ajuste automático del desplazamiento. Una tarjeta mayor que la pantalla tiene lectura interna desplazable; nunca recortar texto ni reducir su tamaño para forzarla.
- El pie de paginación no debe cambiar su altura según el desborde: produciría realimentación entre medición, agrupamiento y tamaño disponible.
- Abandonar un guardado no garantiza cancelar la escritura en Supabase. Descartar respuestas visuales tardías y advertir que se debe actualizar el listado antes de reintentar.
- `QRDisplay.className` personaliza sólo el contenedor. Conservar por defecto la presentación de otros consumidores y el contraste legible del QR.
- Las esperas de mesas usan `logo.png` con indicador. No reemplazar el logo por el icono genérico de Expo ni por un carácter de taco.
- No mostrar identidades o perfiles fijos en las cabeceras de mesas.
- No confundir cambiar disponibilidad con liberar una asignación o confirmar un pago. Estas invariantes deben garantizarse en servidor.

## Contrato QR
- `dni`: acepta únicamente PDF417 y usa `parseDniPdf417`.
- `ingreso`: acepta `chido:ingreso:v1`.
- `mesa`: acepta `chido:mesa:<uuid>:v1` y debe compararse con la mesa asignada en Supabase.
- `propina`: acepta sólo `chido:propina:20:v1`, `15`, `10`, `5` o `0`.
- El componente scanner lee y comunica datos; el servicio valida autorización, estado y persistencia. Nunca confiar sólo en el contenido del QR para habilitar acciones.

## Estructura QR implementada
```
src/
├── components/ui/
│   ├── QRDisplay.tsx
│   └── QRScanner.tsx
├── services/
│   ├── mesas.ts
│   ├── propinas.ts
│   └── qr.ts
├── types/
│   └── qr.ts
└── utils/
    └── qr.ts
```

No crear Context global para QR salvo que varias pantallas necesiten compartir su estado activo. Los servicios y tipos públicos son la integración preferida entre integrantes.

## Validación antes de cerrar una tarea
```bash
npm run lint
npx tsc --noEmit
```

Además, probar en un dispositivo físico todo cambio de cámara, QR, vibración o push. Para QR verificar un payload válido, uno inválido, uno de tipo incorrecto y un caso no autorizado.

No declarar exitosa la validación general si falla por archivos ajenos: informar los bloqueos y distinguirlos de la comprobación de los archivos modificados. El `tsconfig.json` actual también incluye código externo de referencia; no corregir sus dependencias ni rutas como parte de Chido.
