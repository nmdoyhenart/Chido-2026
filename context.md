# Contexto del Proyecto Chido - TFI 2026

## Fuente de requisitos
`Trabajo práctico - 2026 - TFI.pdf` define una aplicación móvil de gestión de restaurante. Las fechas indicadas son 17-10-2026, 07-11-2026 y 28-11-2026. Para promocionar en la primera fecha deben estar completos los puntos 1 a 22 y los requerimientos excluyentes.

## Requerimientos excluyentes
- Todo texto, validación y mensaje debe estar en español y sin abreviaturas.
- Validar todos los campos y usar avisos o modales propios, nunca `Alert` nativo.
- Mostrar un spinner con el logo en cada espera asíncrona y vibrar ante errores.
- Generar y leer códigos QR según su propósito.
- Usar notificaciones push y correo empresarial automático donde lo exige el PDF.
- Ocupar toda la pantalla y permitir desplazamiento sin cortar contenido, también con teclado o texto ampliado.
- No usar modo oscuro ni fondos blancos, claros, negros u oscuros. Las vistas existentes todavía requieren una revisión de cumplimiento visual; no cambiar su paleta sin coordinación con el equipo.

## Estado actual tras el merge en `test`
- El espacio de trabajo contiene splash, autenticación, registro y aprobación de clientes, inicio, alta de empleado, platos y bebidas, mesas, flujos preliminares de cliente registrado/anónimo, supervisor y una pantalla de prueba QR. Las rutas de recuperación y restablecimiento de contraseña fueron creadas, pero todavía no tienen implementación.
- `src/app/cliente/home.tsx` presenta una bienvenida, acceso funcional al escaneo del QR de mesa y tarjetas visuales de encuestas y solicitud de mesa. Las dos últimas se muestran como próximas porque sus flujos de negocio todavía no existen.
- Hay numerosos cambios locales de otros integrantes. No revertirlos ni sobrescribirlos.
- `package.json` declara Expo 57, React Native 0.86.3, React 19.2.3, TypeScript 6, Expo Router, NativeWind 4, Supabase, cámara, audio, imágenes, QR SVG y AsyncStorage. No incluye `expo-notifications`.
- `src/app/_layout.tsx` importa `global.css` y monta `AppSessionProvider`.
- `AppSessionContext` sincroniza la sesión real de Supabase y el perfil de `usuarios`; invitado y simulación siguen siendo modos locales sin autorización real.
- Coexisten dos clientes autenticados de Supabase: autenticación, registro y aprobación usan `src/lib/supabase.ts`; mesas, productos y varios flujos anteriores usan `lib/supabase.ts`. También existe un cliente público sin sesión para autorregistro. Su unificación sigue pendiente.
- El alta de cliente registrado está implementada con fotografía, DNI manual o PDF417, cuenta Auth y estado pendiente de aprobación. El flujo de correos de registro está desplegado y probado; las políticas generales de Supabase siguen requiriendo revisión.

## Registro y aprobación de clientes
- `src/app/(auth)/registro.tsx` y `registrar-cliente` implementan el alta de cliente registrado. La Edge Function crea la cuenta Auth, guarda la fotografía y crea el perfil pendiente.
- `src/app/(app)/clientes-pendientes.tsx` permite a dueño o supervisor listar solicitudes, ver fotografías firmadas y aceptar o rechazar. La autorización visual existe; RLS debe confirmar la misma restricción en servidor.
- `resolver-registro` verifica JWT, perfil responsable y transición desde `pendiente`. `resolverCliente` invoca esa Edge Function, por lo que aceptar o rechazar ya no actualiza `usuarios` directamente desde el dispositivo.
- `registrar-cliente`, `resolver-registro` y `enviar-correos-registro` están desplegadas y activas en el proyecto Supabase `chido-2026`. Se configuraron los secrets de Resend, remitente, logo público y autorización del worker, sin guardar sus valores en el repositorio.
- `enviar-correos-registro` valida que el estado de cada aviso tomado de la cola siga coincidiendo con `usuarios.estado_registro`; si cambió durante la espera, descarta el aviso obsoleto. Así, aprobar o rechazar antes del siguiente ciclo no envía también el correo pendiente.
- `pg_cron`, `pg_net` y `supabase_vault` están habilitados. `private.chido_enviar_correos_registro()` lee `chido_correos_scheduler_secret` desde Vault e invoca el worker; el job `chido-enviar-correos-registro` está activo cada minuto (`* * * * *`). El SQL versionado está en `supabase/migrations/20260913_scheduler_correos_registro.sql` y no contiene secretos.
- Se validó en dispositivo y base de datos: registro sin decisión inmediata envía `pendiente` y luego el estado final; una decisión tomada antes del próximo ciclo envía sólo `aceptado` o `rechazado`. Los últimos jobs de Cron finalizaron correctamente.

## Integración de Mesas
El punto funcional principal es el **4: alta y gestión de mesas**, páginas 7 y 8. La definición de QR de mesa está en la página 5. La asignación y confirmación de clientes corresponden a los puntos 10 y 11; la liberación tras el pago, al punto 22. No confundir esos procesos con cambiar manualmente la disponibilidad.

### Navegación
- La gestión de mesas se abre funcionalmente desde `/supervisor/home`. El panel autenticado de dueño/supervisor muestra tarjetas de mesas sin navegación activa.
- `src/app/mesas/gestion.tsx` muestra el listado paginado, contador de mesas disponibles, actualización manual, cambio de disponibilidad y código QR de cada mesa.
- Desde gestión, **Agregar mesa** abre `/mesas/alta`.
- El alta valida número entero positivo, cantidad de comensales, tipo y fotografía; comprueba número duplicado mediante el servicio, sube la foto y crea la mesa inicialmente vacía.
- Al guardar se muestra el QR generado con el UUID persistido. Se puede volver a gestión o crear otra mesa.
- Gestión vuelve a consultar los datos cuando recupera el foco para incluir las altas recientes.
- Las cabeceras de estas dos pantallas ya no muestran una persona o un perfil fijo.
- Las salidas de alta y gestión de mesas usan `dismissTo('/supervisor/home')`, incluso al entrar sin historial. Las cargas no cubren estas salidas; cámara, QR y avisos también ofrecen cierre visible. Falta agrupar/proteger esa ruta de forma consistente con la sesión real.
- La lectura tiene un límite de quince segundos y descarta respuestas anteriores al recuperar el foco. Las mutaciones no se declaran canceladas al navegar: pueden finalizar en el servidor y requieren revisar el listado antes de reintentar.

### Identidad visual
- Las referencias internas de las vistas principales de mesas son `src/app/agregar-empleado.tsx`, `src/app/productos/alta.tsx` y `src/components/Header.tsx`.
- Gestión y Alta de mesas reutilizan fondo `#d97736`, componente `Header`, barra compacta de regreso, textos blancos y controles `#b35e25` / `#9c5120`, para mantener la misma línea de estilo.
- No se modificaron los estilos de login, registro ni splash para esta integración, ni se agregó una paleta global.
- Alta, listado y modales tienen áreas seguras y contenido desplazable. Las esperas muestran logo e indicador; los errores usan avisos propios y hápticos.
- `QRDisplay` permite personalizar el contenedor con `className`. Su estilo predeterminado y el contraste del código se conservan para no alterar otros consumidores.
- Las imágenes de referencia `altaMesa.png` y `gestioMesa.png` son obligatorias para toda modificación visual de Alta y Gestión de mesas. Respetar su jerarquía y composición: título con salida lateral, foto destacada y campos en fila en Alta; tarjetas amplias con icono o imagen, estado y QR lateral en Gestión. No copiar la identidad fija presente en la referencia: la cabecera debe permanecer genérica. En poco ancho o con texto ampliado se permite una columna. Se mantiene **Preferencial** para el valor persistido `VIP`.
- El listado usa la altura medida de cada tarjeta para agrupar páginas completas y ajusta el desplazamiento a sus límites. Conserva una mesa como referencia al cambiar las medidas. Si una tarjeta supera por sí sola el espacio, queda sola con lectura desplazable y controles de página disponibles.

### Archivos del módulo
- `src/components/negocio/mesas/MesaCard.tsx`: fotografía, datos, estado y acciones de disponibilidad y QR.
- `src/components/negocio/mesas/ListadoMesas.tsx`: medición y páginas de tarjetas completas, desplazamiento con ajuste y navegación fija.
- `src/utils/paginacionMesas.ts`: agrupamiento puro por altura; pruebas de Node.js en `paginacionMesas.test.mjs`, separadas del tipado móvil.
- `src/hooks/useMesas.ts`: estado de lista y llamadas al servicio.
- `src/services/mesas.ts`: consultas y mutaciones Supabase, incluyendo servicios separados de asignación, liberación y confirmación.
- `src/services/storage.ts`: fotografía en el bucket `mesas` y limpieza si falla el alta.
- `src/types/mesa.ts`: tipos del contrato de mesas.
- `src/components/ui/QRDisplay.tsx` y `QRScanner.tsx`: presentación y lectura reutilizables.

## Contrato de datos existente
```text
mesas(id, numero unique, cantidad_comensales, tipo,
      disponibilidad default 'vacía', foto, cliente_id, qr_confirmado_at)
productos(id, nombre, descripcion, tiempo_elaboracion, precio, fotos[], tipo)
usuarios(id, nombres, apellidos, dni, cuil, correo unique, perfil,
         foto_perfil, estado_registro default 'pendiente', created_at)
lista_espera(id, usuario_id unique, created_at)
```

- Tipos de mesa usados por el código: `VIP`, `estándar`, `movilidad reducida`. La interfaz presenta `VIP` como **Preferencial**, sin cambiar el valor persistido.
- Disponibilidad: `vacía` u `ocupada`.
- `supabase/migrations/20260904_qr_mesas.sql` contiene vínculo cliente-mesa, confirmación y lista de espera; también incluye tablas de pedidos y detalles que deben coordinarse con su responsable.
- La presencia de la migración no confirma que esté aplicada en Supabase. Esta integración de vistas no ejecuta migraciones ni modifica tablas, enums, bucket o políticas.
- No inventar columnas, RPC ni valores de perfiles: confirmar antes con el responsable de Supabase.
- El QR usa el UUID existente. No usar un `DEFAULT` que intente referirse a otra columna de la fila.
- El flujo de cliente anónimo usa columnas de `lista_espera` no declaradas en la migración versionada (`identificador`, `nombre`, `foto_url`, `tipo_cliente`, `estado`). Confirmar y unificar ese contrato antes de integrarlo.

## Contrato QR implementado
- Ingreso: `chido:ingreso:v1`.
- Mesa: `chido:mesa:<uuid>:v1`.
- Propina: `chido:propina:<porcentaje>:v1`, únicamente 20, 15, 10, 5 o 0.
- DNI: únicamente PDF417, con `parseDniPdf417`.
- Generación y parsing puro en `src/utils/qr.ts`; tipos públicos en `src/types/qr.ts`.
- `QRScanner` gestiona permisos, lectura, bloqueo durante procesamiento, aviso y vibración. El callback/servicio debe verificar el propósito del QR y la autorización.
- `confirmarMesaPorQr` compara la mesa leída con la asignada al cliente en Supabase antes de persistir `qr_confirmado_at`.
- `obtenerMesaDesdeQr` consulta datos de mesa para perfiles de empleado admitidos por el servicio; recibir un perfil desde el cliente no sustituye políticas de servidor.
- `src/app/qr-prueba.tsx` es una demostración de parsing con datos fijos, no un flujo autorizado de negocio.
- La integración de Mesas muestra QR reales de las mesas persistidas. Existen pantallas preliminares de escaneo, menú, pedido y chat, pero todavía no validan ni persisten el flujo autorizado de mesa, pedido, encuesta o cuenta.
- El flujo anónimo de ingreso es un prototipo: usa `ENTRADA_LOCAL` y almacenamiento local, incompatibles con el contrato `chido:ingreso:v1`. Debe migrarse al servicio con validación de servidor.

## Coordinación pendiente
1. Confirmar la migración desplegada, los permisos del bucket `mesas`, RLS y RPC atómicas con el responsable de Supabase.
2. Aplicar protección consistente a las rutas externas a `/(app)` y respaldar toda autorización con RLS o funciones de servidor. El acceso desde Inicio y los roles simulados no constituyen autorización.
3. Impedir en servidor inconsistencias entre disponibilidad, asignación y pago. El cambio manual de disponibilidad existente no libera `cliente_id` ni confirma el pago.
4. Hacer atómica la asignación con la salida de lista de espera; verificar que no haya dos mesas para un cliente ni dos clientes para una mesa.
5. Integrar scanners en los puntos 1, 5, 9, 10, 11 y 21 con sus servicios, no sólo con parsing local. Los servicios iniciales de mesa, espera y propina existen, pero aún no están conectados de forma completa ni atómica a las pantallas.
6. Acordar el contrato de pedidos y propina. La selección debe persistirse antes de habilitar la cuenta/pago.
7. Revisar los `Alert` restantes, esperas, hápticos y `userInterfaceStyle: "automatic"` fuera del módulo Mesas con los responsables de esas vistas.
8. Separar los flujos prototípicos de los validados: menú, chat, alta de empleado y cliente anónimo aún contienen datos de muestra, `Alert` nativo o incumplimientos visuales/excluyentes.
9. Mantener el secreto `chido_correos_scheduler_secret` de Vault sincronizado si cambia `CHIDO_CORREOS_SECRET` en Edge Function Secrets. La función de correos depende de ambos valores.

## Notificaciones push
- El PDF exige notificaciones push con la aplicación abierta o cerrada; los primeros casos requeridos aparecen en los puntos 6, 9 a 18 y 21 a 22.
- Android tiene implementado el evento `cliente_registrado`: el dispositivo del dueño o supervisor se registra en `dispositivos_push`, Supabase encola el aviso y `enviar-notificaciones-push` lo entrega mediante Firebase Cloud Messaging. Al tocarlo navega a Clientes Pendientes.
- Las migraciones son `20260914_notificaciones_push_firebase.sql` y `202609140001_corregir_rpc_notificaciones_push.sql`. La segunda expone el RPC de toma de cola a `service_role` en `public`, para que la Edge Function pueda procesarlo.
- `expo-notifications` está configurado para APK Android development, preview y production. Expo Go no incluye push remoto Android desde SDK 53: `src/services/notificaciones-push.ts` carga ese módulo sólo fuera de Expo Go, para permitir desarrollo de pantallas con `npx expo start --go`.
- iOS todavía no está implementado: requiere cuenta Apple Developer, APNs, token y envío específico, además de una compilación iOS propia.

## Validación

- Al solicitar consultas SQL de diagnóstico para ejecutar en Supabase, devolver los resultados como un único objeto JSON y omitir secretos, tokens y datos personales salvo que sean imprescindibles para el diagnóstico.

```bash
npm run lint
npx tsc --noEmit
```

- El entorno actual dispone de `npm` y `node`.
- Al ejecutar `npm run lint` tras el merge, ESLint reporta 15 errores y 32 advertencias. Los errores están en los prototipos de chat y menú, splash, `ConfirmacionDni`, `SolicitudesClientes` y `ChidoLoader`; no corresponden a Mesas ni a la base local de notificaciones.
- Al ejecutar `npx tsc --noEmit`, existen dos errores de aplicación ajenos a este módulo: `clearSession` no existe en `AppSessionContextType` y `AppRole` se exporta dos veces. Además, `tsconfig.json` incluye las Edge Functions Deno, por lo que TypeScript móvil no puede resolver `Deno`, `npm:@supabase/...` ni imports `.ts`. No corregir esos entornos mezclados como parte de otro módulo.
- Las comprobaciones acotadas de notificaciones pasaron: `npx eslint src/types/notificaciones.ts src/utils/notificaciones.ts`, `node --experimental-strip-types --test src/utils/notificaciones.test.mjs` y `npx tsc --ignoreConfig --noEmit --strict --target esnext --moduleResolution bundler --module esnext src/types/notificaciones.ts src/utils/notificaciones.ts`.
- La CLI de Supabase está disponible mediante `npx supabase`, tiene sesión autenticada y el proyecto `chido-2026` está vinculado localmente. `supabase/.temp/` contiene sólo metadatos generados y está ignorado por Git.
- La exportación Android con `npx expo export --platform android --output-dir dist/mesas-android-verificacion` finalizó correctamente. Es una comprobación de empaquetado, no una prueba en dispositivo ni una compilación de instalador.
- La exportación web empaquetó los módulos, pero falló durante el renderizado estático por `window is not defined` al inicializar el almacenamiento de la sesión Supabase desde autenticación. Este bloqueo de exportación queda pendiente fuera de la integración visual de Mesas.
- Verificar en dispositivo físico cámara concedida/denegada, captura fallida, formulario inválido, número duplicado, error de red, alta correcta, regreso al listado y disponibilidad.
- Para QR probar payload válido, inválido, de tipo incorrecto y caso no autorizado al integrar el scanner de negocio.
- `src/components/auth/CamaraRegistro.tsx` desmonta brevemente `CameraView` antes de alternar entre cámara frontal y trasera, y muestra un aviso recuperable tras ocho segundos si Android no vuelve a emitir `onCameraReady`. Validar el giro en dispositivo físico; la exportación Android y el lint acotado finalizaron correctamente.
- Comprobar lectura del QR mostrado y diseño en pantalla pequeña, orientación horizontal, teclado abierto y texto ampliado. La compilación no reemplaza estas pruebas físicas.
- Pruebas de paginación: `node --experimental-strip-types --test src/utils/paginacionMesas.test.mjs`. Los seis casos cubren límites exactos, separación, alturas variables, tarjeta sobredimensionada y conservación del orden sin pérdidas.
- Probar apertura directa en `/mesas/gestion`, salida durante red lenta, regreso tras un alta, deslizamiento corto/largo hasta una página completa y cierre de cámara durante una captura. Reiniciar Metro con `--clear` limpia la caché del empaquetador, no garantiza volver a la ruta `/`.
