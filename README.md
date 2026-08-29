# Chido - 2026

<p align="center">
  <img width="300" alt="logo" src="https://github.com/user-attachments/assets/7aaa525a-d1e8-42e6-8abd-d13b044b31ae" />
</p>

<p align="center">
Trabajo Final Integrador — Aplicación de gestión de restaurante (mobile)
</p>

## Integrantes

| Apellidos y Nombres | Rol | Módulos (objetivos) a desarrollar | Fecha de inicio | Fecha de finalización | Branch |
|---|---|---|---|---|---|
| Doyhenart, Nicolás | **Líder** | Cliente registrado y Cliente anónimo: registro, aprobación, QR de ingreso/mesa, menú, chat con mozo, carrito, estado de pedido | | |nico |
| Gauto Morales, Silvina | Integrante | Dueño y Supervisor: alta de empleado, alta de mesa, gestión de mesas, aprobación/rechazo de clientes, mails automáticos | | |silvina |
| Martín, Emmanuel David | Integrante | Cocinero y Cantinero: alta de plato, alta de bebida, cartas, vistas de cocina y bar (Kanban) | | |emma |
| Antuñez, Juan Ignacio | Integrante | Metre y Mozo: lista de espera, asignación de mesas, chat con clientes, confirmación/rechazo de pedidos | | |juan |

## Descripción del proyecto

Aplicación mobile para la gestión integral de un restaurante, enfocada en la experiencia de usuario tanto de clientes como de empleados del comercio. Contempla perfiles de dueño, supervisor, metre, mozo, cocinero, cantinero, cliente registrado y cliente anónimo, con flujos de ingreso al local, asignación de mesas, pedidos, encuestas y juegos con descuentos.

## Perfiles de usuario

- Dueño
- Supervisor
- Metre
- Mozo
- Cocinero
- Cantinero
- Cliente registrado
- Cliente anónimo

## Distribución de trabajo por perfil

### Dueño / Supervisor (Silvina)
- Alta de empleado (con foto y lector de QR de DNI)
- Alta de mesa (con foto y generación automática de QR)
- Gestión de mesas (listado y disponibilidad)
- Listado de clientes pendientes de aprobación
- Aceptación / rechazo de clientes (con envío automático de mail)

### Cocinero / Cantinero (Emmanuel)
- Alta de plato / Alta de bebida (con 3 fotos cada uno)
- Carta de platos / Carta de bebidas
- Vista de cocina y vista de bar (pedidos: Pendientes / En preparación / Finalizados)
- Pedidos pendientes de cocina y bar, agrupados por número de mesa, con fecha/hora, ítems y cantidades.
- Actualización de estado de elaboración: pendiente, en preparación y finalizado.
- Aviso de pedido listo al mozo cuando ambos sectores intervinientes hayan finalizado.

### Metre / Mozo (Juan)
- Lista de espera (con eliminación de clientes)
- Disponibilidad del salón y asignación de mesas
- Bandeja de consultas y chat con clientes
- Pedidos por confirmar y confirmación/rechazo
- Pedidos listos para entrega, con validación de pedido completo entre cocina y bar.
- Entrega del pedido y confirmación de recepción por parte del cliente.
- Recepción de solicitud de cuenta.
- Confirmación de pago y liberación de la mesa.

### Cliente registrado / Cliente anónimo (Nicolás)
- Registro (con foto y lector de QR de DNI) y registro rápido anónimo
- QR de ingreso al local y lista de espera
- Escaneo de QR de mesa asignada
- Menú/carta, chat con el mozo, carrito y armado de pedido
- Estado del pedido y edición tras rechazo
- Tres juegos funcionales para cliente registrado con descuentos de 10%, 15% y 20%.
- Aplicación de un único descuento, únicamente si se gana en el primer intento; acceso libre posterior a los juegos.
- Visualización de los cambios de estado del pedido durante preparación y entrega.
- Encuesta de satisfacción, limitada a una respuesta por estadía.
- Resultados de encuestas en gráficos separados: torta, barras y línea.
- Solicitud de cuenta, lectura de QR de propina y selección obligatoria del porcentaje.
- Detalle de cuenta: productos, precios unitarios, importes, descuento aplicado, propina y total.
- Pago simulado y espera de confirmación del mozo.
- Consulta de resultados de encuestas mediante el QR de ingreso/lista de espera.

## Pantallas de la aplicación

### Splash

| Pantalla de Splash |
| :---: |
| <img width="240" alt="Splash screen" src="https://github.com/user-attachments/assets/1e2be373-be36-498c-88f7-5f908a73f44f" /> |

### Dueño

| Home | Alta de empleado | Alta de mesa |
| :---: | :---: | :---: |
| <img width="240" alt="Home Dueño" src="https://github.com/user-attachments/assets/a020736d-f831-4e00-81f8-2042dc990a07" /> | <img width="240" alt="Alta de Empleado" src="https://github.com/user-attachments/assets/1cd0dff9-6a5b-4979-942b-d054dc896905" /> | <img width="240" alt="Alta de Mesa" src="https://github.com/user-attachments/assets/7ddd4695-ec68-41b9-bf54-4518029f36bb" /> |

| Gestión de mesas | Clientes pendientes |
| :---: | :---: |
| <img width="240" alt="Gestión de Mesas" src="https://github.com/user-attachments/assets/71aa769c-ad66-4fcc-89fb-a2887159c0ae" /> | <img width="240" alt="Clientes Pendientes" src="https://github.com/user-attachments/assets/a3ef55fe-fcc0-41a4-b5de-0403267eb21d" /> |

---

### Supervisor

| Home | Alta de empleado | Alta de mesa |
| :---: | :---: | :---: |
| <img width="240" alt="Home Supervisor" src="https://github.com/user-attachments/assets/959f94d0-ca93-4772-885b-2ba337347687" /> | <img width="240" alt="Alta de Empleado" src="https://github.com/user-attachments/assets/fd38b56f-e9a1-4247-9548-58f8b3a7d588" /> | <img width="240" alt="Alta de Mesa" src="https://github.com/user-attachments/assets/8dfaf113-d302-42e3-92f8-b6da3fd7dad1" /> |

| Gestión de mesas | Clientes pendientes |
| :---: | :---: |
| <img width="240" alt="Gestión de Mesas" src="https://github.com/user-attachments/assets/641d445d-41b9-41da-ad40-d2dd2410da24" /> | <img width="240" alt="Clientes Pendientes" src="https://github.com/user-attachments/assets/e3eaf9f3-ca2a-4170-a4fa-a7d590e1e097" /> |

---

### Cocinero

| Home | Alta de plato | Carta de platos |
| :---: | :---: | :---: |
| <img width="240" alt="Home Cocinero" src="https://github.com/user-attachments/assets/eb95a3ca-29ed-4d9a-952d-8385c5cf97ee" /> | <img width="240" alt="Alta de Plato" src="https://github.com/user-attachments/assets/0946c298-591e-4e0a-8bbe-d40d7db3b8b7" /> | <img width="240" alt="Carta General" src="https://github.com/user-attachments/assets/d62a8f75-351a-4ef1-b82f-cfd5b8784222" /> |

---

### Metre

| Home | Lista de espera | Disponibilidad del salón |
| :---: | :---: | :---: |
| <img width="240" alt="Home Metre" src="https://github.com/user-attachments/assets/4a3973bc-5db2-4e05-8b5f-649018d5d8e8" /> | <img width="240" alt="Lista de Espera" src="https://github.com/user-attachments/assets/6f0ea750-782e-4eff-9271-981295776486" /> | <img width="240" alt="Mapa del Salon" src="https://github.com/user-attachments/assets/f80d7fcc-0853-471f-aac0-ddde43139ba7" /> |

---

### Cantinero

| Home | Alta de bebida | Carta de bebidas | Vista bar |
| :---: | :---: | :---: | :---: |
| <img width="200" alt="Home Cantinero" src="https://github.com/user-attachments/assets/ff44051b-c392-4819-a839-ce8f9eb3504b" /> | <img width="200" alt="Alta de Bebida" src="https://github.com/user-attachments/assets/34d3cb86-2bfc-4db3-be0b-aa9db5669890" /> | <img width="200" alt="Carta de Bebidas" src="https://github.com/user-attachments/assets/f9231f32-5ef0-4f97-b8ac-5a05cb2bdd64" /> | <img width="200" alt="Vista Bar" src="https://github.com/user-attachments/assets/74f89c07-19a5-4002-9dcc-77b8a8551ea2" /> |
## Profesores

Maximiliano Neiner, Alejandro Constanzo, Nicolás Ferrero, Augusto Morelli, Octavio Villegas, Alejandro Loredo
