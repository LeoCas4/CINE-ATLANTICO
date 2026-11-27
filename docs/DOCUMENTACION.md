# Cine Atlántico: documentación del sistema de boletos

Versión 2.0 (microservicios con RabbitMQ) · 27 de noviembre de 2026 · Leonardo Castillo

## Índice

1. [Resumen](#1-resumen)
2. [Arquitectura de microservicios](#2-arquitectura-de-microservicios)
3. [Tecnologías utilizadas](#3-tecnologías-utilizadas)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Flujo de compra y control de concurrencia](#5-flujo-de-compra-y-control-de-concurrencia)
6. [Mensajería entre microservicios](#6-mensajería-entre-microservicios)
7. [Algoritmo de asignación automática](#7-algoritmo-de-asignación-automática)
8. [Web service REST](#8-web-service-rest)
9. [Interfaz de usuario](#9-interfaz-de-usuario)
10. [Estructura de archivos](#10-estructura-de-archivos)
11. [Instalación y ejecución](#11-instalación-y-ejecución)
12. [Pruebas automáticas](#12-pruebas-automáticas)
13. [Limitaciones y posibles mejoras](#13-limitaciones-y-posibles-mejoras)

## 1. Resumen

Cine Atlántico es una aplicación web para comprar boletos de cine y asignar asientos. Usa Node.js, Express y MongoDB, una base de datos no relacional y gratuita. Su punto central es que **un asiento nunca se vende dos veces**, aunque varias personas intenten comprarlo al mismo tiempo.

En la versión 2 el sistema se dividió en **tres microservicios** (boletos, notificaciones y reportes) que se comunican con mensajes a través de **RabbitMQ**. Así, el cliente recibe sus boletos por correo con un código QR y el cine ve estadísticas en vivo, sin que un fallo en esos servicios detenga la venta.

**Objetivos**

- Permitir que un cliente compre boletos desde el navegador, eligiendo sus asientos en un mapa de la sala.
- Asignar automáticamente los mejores asientos disponibles cuando el cliente lo pida.
- Dar al administrador herramientas para programar la cartelera y consultar las ventas.
- Enviar los boletos por correo y calcular estadísticas de forma asíncrona, con servicios independientes.

**Funcionalidades**

| Área | Funcionalidad |
| --- | --- |
| Cartelera | Películas con póster, clasificación, género, duración y horarios agrupados por día |
| Selección de asientos | Mapa interactivo con pasillos, filas VIP, asientos deshabilitados y vendidos |
| Asignación automática | Elige N asientos juntos, centrados y a buena distancia de la pantalla |
| Compra | Datos del cliente, método de pago, código de compra y un boleto con código por asiento |
| Correo de boletos | Correo con un código QR por boleto al comprar, y aviso al cancelar (servicio de notificaciones) |
| Mis boletos | Consulta por código o email y cancelación, que libera los asientos |
| Administración | Alta de películas, salas y funciones, validación de horarios encimados, reporte de ventas y estadísticas en vivo (servicio de reportes) |

**Cartelera de ejemplo:** Star Wars, Jurassic Park, Harry Potter, Minions, Parasite y Obsesión, en 3 salas (Sala 1, Sala 2 y Sala 3 IMAX).

## 2. Arquitectura de microservicios

El sistema está formado por **tres microservicios** independientes, cada uno con su propia responsabilidad. No se llaman directamente entre sí: el servicio de boletos **publica eventos** en RabbitMQ, y los demás servicios los **consumen** desde sus propias colas.

![Diagrama de la arquitectura de microservicios](diagramas/arquitectura.png)

| Componente | Responsabilidad | Se comunica con |
| --- | --- | --- |
| Navegador | Mostrar las vistas y capturar lo que hace el usuario | Servicio de boletos, por HTTP con JSON |
| **Servicio de boletos** (puerto 3000) | Página web, API REST, reserva atómica de asientos, compras y cancelaciones; publica los eventos | Navegador, MongoDB `cine`, RabbitMQ y, por HTTP, el servicio de reportes |
| **Servicio de notificaciones** | Envía los correos con los boletos y sus códigos QR | RabbitMQ y servidor de correo (Mailpit) |
| **Servicio de reportes** (puerto 3002) | Calcula las estadísticas de ventas por película | RabbitMQ y su propia base MongoDB `cine_reportes` |
| **RabbitMQ** | Broker de mensajes: recibe los eventos y los reparte en las colas | Los tres microservicios |
| **MongoDB** | Guarda los datos; cada servicio usa su propia base de datos | Servicio de boletos y servicio de reportes |
| **Mailpit** | Buzón de correo de prueba para la demostración | Servicio de notificaciones |

**¿Por qué microservicios con mensajería?**

- **Respuesta rápida:** el cliente recibe su confirmación al instante; el correo y las estadísticas se procesan después, en segundo plano.
- **Tolerancia a fallas:** si el servicio de correo se cae, los mensajes esperan en su cola y se procesan cuando vuelve. La venta nunca se detiene.
- **Independencia:** cada servicio se puede modificar, reiniciar o escalar sin tocar los demás, y tiene su propia base de datos.
- **Extensibilidad:** un servicio nuevo (por ejemplo, puntos de lealtad) solo tiene que suscribirse a los eventos, sin cambiar el servicio de boletos.

## 3. Tecnologías utilizadas

Todas las tecnologías son gratuitas y de código abierto o tienen un plan gratuito.

| Capa | Tecnología | Versión | Para qué se usa |
| --- | --- | --- | --- |
| Base de datos | MongoDB (Community Server o Atlas M0) | 7.x | Guarda películas, salas, funciones y compras como documentos JSON |
| Acceso a datos | Mongoose | 8.x | Define los esquemas, valida los datos y hace las consultas a MongoDB |
| Servidor | Node.js | 18 o superior (probado en 22) | Ejecuta el código JavaScript del servidor |
| Web service | Express | 4.x | Expone la API REST y sirve los archivos de la página |
| Configuración | dotenv | 16.x | Lee la dirección de la base de datos y la clave de administrador del archivo `.env` |
| Interfaz | HTML, CSS y JavaScript sin frameworks | — | Página de una sola vista con mapa de asientos |
| Mensajería | RabbitMQ (con panel de administración) | 3.x | Broker de mensajes entre los microservicios |
| Cliente de RabbitMQ | amqplib | 2.x | Publicar y consumir mensajes desde Node.js |
| Correo | Nodemailer y Mailpit | 10.x / última | Enviar los correos (Nodemailer) a un buzón de prueba con página web (Mailpit) |
| Códigos QR | qrcode | 1.x | Generar el QR de cada boleto |
| Contenedores | Docker y Docker Compose | — | Encender todo el sistema con un solo comando |
| Ejecución local | concurrently | 10.x | Encender los tres servicios en una sola terminal (`npm start`) |
| Pruebas | node:test y mongodb-memory-server | Node 22 / 10.x | Pruebas automáticas contra una base de datos real o en memoria |

**¿Por qué MongoDB?** Una compra con sus boletos, o una función con sus asientos vendidos, se guarda como **un solo documento**. Así, cada pantalla se resuelve con una sola consulta. Además, MongoDB garantiza que modificar un documento es una operación atómica, que es la base del control de asientos (sección 5).

## 4. Modelo de datos

El servicio de boletos usa la base de datos `cine`, con cuatro colecciones principales. Las funciones apuntan a su película y a su sala, y las compras apuntan a su función. Los boletos no tienen colección propia: se guardan dentro de cada compra.

![Diagrama del modelo de datos: 4 colecciones y una lista embebida](diagramas/modelo-de-datos.png)

Todos los documentos tienen además `createdAt` y `updatedAt`, que Mongoose agrega solo. El nombre `funcions` lo genera Mongoose automáticamente a partir del modelo `Funcion`.

**Decisiones de diseño no relacional**

- **Boletos embebidos en la compra:** una sola lectura trae la compra con todos sus boletos, y nunca se consulta un boleto sin su compra.
- **Asientos vendidos dentro de la función:** el mapa de la sala se dibuja con una sola consulta, y permite reservar con una sola operación atómica (sección 5).
- **Referencias por ObjectId** entre función, película, sala y compra: esos datos cambian por separado, y Mongoose los une cuando hace falta con `populate`.

**Colecciones de la mensajería**

| Base de datos | Colección | Qué guarda |
| --- | --- | --- |
| `cine` | `eventospendientes` | Eventos que no se pudieron publicar porque RabbitMQ no estaba disponible (patrón outbox). Se borran al reenviarse |
| `cine_reportes` | `movimientos` | Un documento por evento recibido por el servicio de reportes, con su id único: tipo, compra, película, sala, boletos e importe |

El servicio de reportes **no lee la base `cine`**: se entera de las ventas solo por los eventos. Este principio, una base de datos por microservicio, mantiene a los servicios independientes.

**Índices**

| Colección | Índice | Para qué |
| --- | --- | --- |
| salas | `nombre` (único) | Impedir dos salas con el mismo nombre |
| funcions | `sala` + `inicio`, y `inicio` | Detectar horarios encimados y listar la cartelera por fecha |
| compras | `codigo` (único) | Buscar una compra por su código |
| compras | `cliente.email` y `funcion` | Buscar las compras de un cliente y armar el reporte de ventas |

## 5. Flujo de compra y control de concurrencia

Dos personas nunca pueden comprar el mismo asiento: la reserva es una sola operación atómica en MongoDB, y solo la primera que llega la consigue. La otra recibe un error 409 con los asientos en conflicto.

![Diagrama de secuencia de una compra: caso exitoso y caso de conflicto](diagramas/flujo-de-compra.png)

El paso 4 es la clave. MongoDB garantiza que modificar un documento es indivisible: la condición y la escritura ocurren juntas, sin que otra compra pueda meterse en medio.

```js
Funcion.findOneAndUpdate(
  { _id: funcionId, inicio: { $gt: ahora }, asientosOcupados: { $nin: asientos } },
  { $push: { asientosOcupados: { $each: asientos } } },
  { new: true }
)
```

- **Condición:** la función todavía no empezó y ninguno de los asientos pedidos está en `asientosOcupados` (`$nin`).
- **Escritura:** si la condición se cumple, agrega los asientos a la lista (`$push`). Si no, no cambia nada y devuelve `null`.
- **Compensación:** si al guardar la compra (paso 6) ocurre un error, los asientos se liberan con `$pullAll`.
- **Asignación automática:** si otra persona gana los asientos calculados, el servicio vuelve a leer la función, recalcula los mejores asientos y reintenta hasta 15 veces, con una espera aleatoria corta entre intentos.
- **Cancelación:** el estado cambia de `pagada` a `cancelada` con otra operación atómica, para que una compra no se cancele dos veces; después se liberan sus asientos.

Después de guardar la compra, el servicio de boletos publica el evento `compra.creada` (o `compra.cancelada` al cancelar) **sin hacer esperar al cliente**. La reserva de asientos no pasa por RabbitMQ: el cliente necesita saber en ese mismo momento si consiguió su asiento, y eso solo lo garantiza la operación indivisible de MongoDB.

Este comportamiento está comprobado con pruebas automáticas: 15 compras simultáneas del mismo asiento terminan en exactamente 1 éxito y 14 rechazos (sección 12).

## 6. Mensajería entre microservicios

La mensajería conecta al servicio de boletos con los demás microservicios. Se usa **RabbitMQ** con el protocolo AMQP, a través de la librería `amqplib`; el código compartido está en `servicios/compartido/rabbitmq.js`.

**Elementos de RabbitMQ**

| Elemento | Nombre | Función |
| --- | --- | --- |
| Exchange | `cine.eventos` (tipo *topic*) | Recibe los eventos del servicio de boletos y los copia a las colas suscritas según su clave |
| Cola | `notificaciones` | Eventos para el servicio de notificaciones; suscrita a `compra.*` |
| Cola | `reportes` | Eventos para el servicio de reportes; suscrita a `compra.*` |
| Colas de fallidos | `notificaciones.fallidos` y `reportes.fallidos` | Mensajes que fallaron dos veces (*dead letter queues*), guardados para revisarlos |

Como cada servicio tiene su propia cola, **cada uno recibe su propia copia** de cada evento.

**Eventos**

| Evento | Cuándo se publica | Quién lo consume y qué hace |
| --- | --- | --- |
| `compra.creada` | Al completarse una compra | Notificaciones: envía el correo con los boletos y sus QR. Reportes: suma la venta |
| `compra.cancelada` | Al cancelarse una compra | Notificaciones: envía el aviso de cancelación. Reportes: resta la venta |

Ejemplo de evento:

```json
{
  "id": "3f6c2b1e-8d7a-4c1b-9e2f-5a6b7c8d9e0f",
  "tipo": "compra.creada",
  "fecha": "2026-11-27T21:30:00.000Z",
  "origen": "boletos",
  "datos": {
    "codigo": "CIN-U3B4A4",
    "cliente": { "nombre": "Ana López", "email": "ana@correo.com" },
    "total": 240,
    "boletos": [{ "codigo": "CIN-U3B4A4-F7", "asiento": "F7", "precio": 120, "vip": false }],
    "funcion": { "pelicula": "Star Wars", "sala": "Sala 3 IMAX", "inicio": "2026-11-28T18:00:00.000Z", "formato": "IMAX", "idioma": "Español" }
  }
}
```

**Técnicas de confiabilidad**

| Técnica | Problema que resuelve | Dónde está |
| --- | --- | --- |
| **Patrón outbox** | Si RabbitMQ no está disponible al comprar, el evento se guarda en MongoDB y se reenvía al volver la conexión. La venta nunca se detiene y no se pierde ningún evento | `servicios/boletos/mensajeria.js` |
| **Confirmaciones del publicador** | El servicio de boletos espera a que RabbitMQ confirme que guardó cada mensaje | `mensajeria.js` (`waitForConfirms`) |
| **Mensajes y colas persistentes** | Los mensajes sobreviven a un reinicio de RabbitMQ | `persistent: true`, colas `durable` |
| **Confirmación de procesamiento (*ack*)** | Un mensaje se borra solo cuando el servicio terminó de procesarlo; si el servicio está apagado, el mensaje espera en la cola | Consumidores de notificaciones y reportes |
| **Reintento y cola de fallidos** | Si procesar un mensaje falla, se reintenta una vez; si vuelve a fallar, pasa a `<cola>.fallidos` en lugar de perderse o bloquear la cola | `x-dead-letter-routing-key` en `rabbitmq.js` |
| **Idempotencia** | RabbitMQ puede entregar un mensaje más de una vez; el servicio de reportes guarda cada evento con su id único y no cuenta dos veces una venta | `servicios/reportes/estadisticas.js` |
| **Reconexión automática** | Si RabbitMQ se reinicia, los servicios se reconectan solos | `mantenerConexion` en `rabbitmq.js` |
| **Límite de mensajes simultáneos (*prefetch*)** | Cada servicio procesa pocos mensajes a la vez y no se satura | `canal.prefetch(...)` |

**Comunicación síncrona entre servicios**

El panel de Administración muestra las estadísticas del servicio de reportes. Para eso, el servicio de boletos consulta `GET /estadisticas` del servicio de reportes por HTTP, con un tiempo máximo de 3 segundos. Si el servicio de reportes está apagado, el panel muestra un aviso y el resto del sistema sigue funcionando.

## 7. Algoritmo de asignación automática

El sistema elige los N asientos libres con menor puntaje, priorizando que queden juntos. Está en `servicios/boletos/asignacion.js`, función `mejoresAsientos(sala, ocupados, cantidad)`.

Cada asiento o bloque recibe un puntaje; **menor es mejor**:

```
p = 1.5 · | f − 0.6 · (F − 1) | + | c − (C + 1) / 2 |
```

- f = índice de la fila (A = 0) y F = número de filas. La fila ideal está al 60% hacia el fondo de la sala.
- c = columna central del bloque y C = asientos por fila. La columna ideal es el centro de la pantalla.
- El factor 1.5 hace que alejarse de la fila ideal cueste más que alejarse del centro.

**Pasos**

1. Junta los asientos vendidos y los deshabilitados en un conjunto de no disponibles.
2. Recorre cada fila buscando bloques de N asientos libres seguidos. Un pasillo corta el bloque, porque dos asientos separados por un pasillo no están juntos.
3. Calcula el puntaje de cada bloque y se queda con el menor.
4. Si no existe ningún bloque de N asientos juntos, toma los N asientos sueltos con menor puntaje.
5. Si hay menos de N asientos libres, responde que no hay disponibilidad (código 409).

**Ejemplo:** en la Sala 2 (10 filas × 16 asientos, pasillos después de las columnas 4 y 12), al pedir 4 boletos el sistema elige F7, F8, F9 y F10: la fila ideal y el centro exacto de la pantalla.

La sugerencia que ve el cliente (`GET /api/funciones/:id/sugerencia`) no reserva nada. Al pagar, el servidor vuelve a calcular y reserva de forma atómica; si otra persona ganó esos asientos, recalcula y reintenta hasta 15 veces.

## 8. Web service REST

El servidor expone un web service RESTful que intercambia datos en formato JSON sobre HTTP. La página web lo usa, pero cualquier otro programa (una app móvil, un script) podría usar las mismas rutas.

**Rutas públicas** (`servicios/boletos/routes/publico.js`)

| Método | Ruta | Descripción | Respuesta correcta |
| --- | --- | --- | --- |
| GET | `/api/peliculas` | Cartelera: películas activas con sus funciones próximas y asientos disponibles | 200 |
| GET | `/api/funciones/:id` | Detalle de la función, mapa de la sala y asientos ocupados | 200 |
| GET | `/api/funciones/:id/sugerencia?cantidad=N` | Mejores N asientos (no reserva nada) | 200 |
| POST | `/api/compras` | Compra con asientos elegidos o con asignación automática | 201 |
| GET | `/api/compras/:codigo` | Consulta una compra | 200 |
| GET | `/api/compras?email=...` | Compras de un cliente | 200 |
| POST | `/api/compras/:codigo/cancelar` | Cancela la compra y libera los asientos; pide el email | 200 |

**Rutas de administración** (`servicios/boletos/routes/admin.js`). Todas exigen el encabezado `x-admin-key` con el valor de `ADMIN_KEY`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET, POST | `/api/admin/peliculas` | Lista o crea películas |
| PATCH | `/api/admin/peliculas/:id` | Modifica una película |
| GET, POST | `/api/admin/salas` | Lista o crea salas |
| POST | `/api/admin/funciones` | Programa una función; rechaza horarios encimados en la misma sala (con 15 min de limpieza) |
| DELETE | `/api/admin/funciones/:id` | Borra una función solo si no tiene boletos vendidos |
| GET | `/api/admin/reporte` | Ventas por función: compras, boletos, ingresos y % de ocupación |
| GET | `/api/admin/estadisticas` | Estadísticas del servicio de reportes (las consulta por HTTP) |

**Rutas del servicio de reportes** (puerto 3002)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/estadisticas` | Compras, cancelaciones, boletos vigentes e ingresos por película, totales y últimos eventos |
| GET | `/salud` | Indica si el servicio está encendido |

**Ejemplo: compra con asientos elegidos**

```
POST /api/compras
{
  "funcionId": "6718f0c2a1b2c3d4e5f60718",
  "asientos": ["F7", "F8"],
  "cliente": { "nombre": "Ana López", "email": "ana@correo.com" },
  "metodoPago": "tarjeta"
}
```

Para la asignación automática se envía `"cantidad": 2` en lugar de `"asientos"`. La respuesta (201) trae la compra completa:

```json
{
  "codigo": "CIN-U3B4A4",
  "estado": "pagada",
  "asignacion": "manual",
  "total": 160,
  "boletos": [
    { "codigo": "CIN-U3B4A4-F7", "asiento": "F7", "precio": 80, "vip": false },
    { "codigo": "CIN-U3B4A4-F8", "asiento": "F8", "precio": 80, "vip": false }
  ],
  "funcion": { "inicio": "2026-10-23T19:30:00.000Z", "pelicula": { "titulo": "Harry Potter" }, "sala": { "nombre": "Sala 2" } }
}
```

**Códigos de error.** Todos los errores responden `{ "error": "mensaje" }`.

| Código | Cuándo ocurre |
| --- | --- |
| 400 | Datos inválidos: asiento inexistente, asiento repetido, email mal escrito, más de 10 boletos o función ya iniciada |
| 401 | Falta la clave de administrador o es incorrecta |
| 403 | El email no coincide con el de la compra al cancelar |
| 404 | La función, la compra o la ruta no existen |
| 502 / 503 | El servicio de reportes respondió con un error o no está disponible (solo en `/api/admin/estadisticas`) |
| 409 | Conflicto: asiento ya vendido (incluye `asientosNoDisponibles`), sin cupo, compra ya cancelada u horario encimado |
| 500 | Error interno inesperado |

## 9. Interfaz de usuario

La interfaz es una sola página (`servicios/boletos/public/index.html`) que cambia de vista sin recargar. `public/app.js` hace las peticiones al web service y dibuja cada vista.

| Vista | Qué muestra | Qué puede hacer el usuario |
| --- | --- | --- |
| Cartelera | Cada película con póster, etiquetas, sinopsis y horarios por día | Elegir un horario; los agotados aparecen deshabilitados |
| Selección de asientos | Datos de la función, pantalla, mapa de la sala y resumen con total | Elegir asientos con clic o con "Elegir mejores asientos", llenar sus datos y comprar |
| Confirmación | Código de compra y un boleto por asiento | Volver a la cartelera |
| Mis boletos | Compras encontradas por código o email | Cancelar una compra confirmando su email |
| Administración | Formularios de película, función y sala, reporte de ventas y estadísticas en vivo del servicio de reportes | Dar de alta datos y actualizar el reporte y las estadísticas |

**Identidad visual**

- **Nombre y logo:** "Cine Atlántico", centrado en la parte superior. El logo (`servicios/boletos/public/logo.svg`) es un carrete de película naranja con un botón de reproducir y olas del Atlántico.
- **Colores:** naranja `#ff7a00` como acento sobre negro `#0a0a0a`, con paneles gris muy oscuro.
- **Mapa de asientos:** gris = disponible, gris con borde naranja = VIP, naranja = seleccionado, negro = vendido. Un asiento que alguien más compró parpadea en rojo.
- **Pósters:** se cargan de `servicios/boletos/public/posters/` (`.jpg`, `.png` o `.webp`). Si una película no tiene imagen, se muestra un póster genérico con el logo, el título y el género.
- **Celular:** el diseño se adapta a pantallas pequeñas; el mapa se desplaza de lado si la sala es muy ancha.

| Cartelera | Selección de asientos |
| --- | --- |
| ![Cartelera](cartelera.png) | ![Selección de asientos](seleccion.png) |
| **Confirmación** | **Administración** |
| ![Confirmación](confirmacion.png) | ![Administración](admin.png) |

**Correo de boletos** (servicio de notificaciones)

El correo usa la misma identidad visual: fondo negro, acentos naranjas y un boleto por asiento con su código QR. El QR contiene el código del boleto, que el cine escanearía en la entrada.

![Correo con los boletos y sus códigos QR](correo.png)

**Panel de RabbitMQ**

En http://localhost:15672 se ven las colas en vivo. En la captura, el servicio de notificaciones estaba apagado y un mensaje espera en su cola:

![Panel de RabbitMQ con un mensaje en espera](rabbitmq.png)

## 10. Estructura de archivos

El repositorio está organizado por microservicio dentro de la carpeta `servicios/`.

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `servicios/compartido/rabbitmq.js` | Conexión a RabbitMQ con reconexión, exchange, colas y colas de fallidos |
| `servicios/boletos/server.js` | Punto de entrada del servicio de boletos: conecta a MongoDB y RabbitMQ y enciende el servidor |
| `servicios/boletos/app.js` | Configura Express: archivos estáticos, rutas `/api` y manejo central de errores |
| `servicios/boletos/servicioCompras.js` | Lógica de negocio: validar, reservar de forma atómica, crear la compra, cancelar y publicar los eventos |
| `servicios/boletos/mensajeria.js` | Publicación de eventos con confirmación y patrón outbox |
| `servicios/boletos/asignacion.js` | Algoritmo de mejores asientos |
| `servicios/boletos/models/` | Esquemas `Pelicula`, `Sala`, `Funcion` y `Compra` |
| `servicios/boletos/routes/` | Rutas públicas y de administración del web service |
| `servicios/boletos/seed.js` | Carga los datos de ejemplo (borra los anteriores) |
| `servicios/boletos/public/` | Página web: `index.html`, `app.js`, `styles.css`, `logo.svg` y `posters/` |
| `servicios/notificaciones/index.js` | Consume la cola `notificaciones` y envía los correos |
| `servicios/notificaciones/plantillas.js` | Correos de compra (con QR) y de cancelación |
| `servicios/reportes/index.js` | Consume la cola `reportes` y expone `GET /estadisticas` |
| `servicios/reportes/estadisticas.js` | Registro idempotente de eventos y cálculo de estadísticas |
| `test/` | Pruebas automáticas (`cine.test.js` y `mensajeria.test.js`) |
| `docs/` | Esta documentación, la guía de exposición, diagramas y capturas |
| `Dockerfile` | Imagen única para los tres microservicios |
| `docker-compose.yml` | Enciende MongoDB, RabbitMQ, Mailpit y los tres microservicios |
| `.env.example` | Plantilla de configuración para ejecutar sin Docker |
| `README.md` | Guía de instalación paso a paso para principiantes |

**Ramas de Git**

| Rama | Propósito |
| --- | --- |
| `main` | Versión estable; recibe cambios solo desde `develop`. Etiquetas `v1.0.0` (monolito) y `v2.0.0` (microservicios) |
| `develop` | Integración de las ramas de trabajo terminadas |
| `refactor/estructura-microservicios` | Reorganización del código en `servicios/` |
| `feature/mensajeria-rabbitmq` | Publicación de eventos y patrón outbox |
| `feature/servicio-notificaciones` | Microservicio de correos |
| `feature/servicio-reportes` | Microservicio de estadísticas |
| `feature/docker-compose` | Ejecución con Docker Compose |
| `test/pruebas-mensajeria` | Pruebas de la mensajería |
| `docs/microservicios` | Documentación de la versión 2 |

## 11. Instalación y ejecución

Hay dos formas de ejecutar el sistema. La guía detallada para principiantes está en el [README.md](https://github.com/LeoCas4/Cine-Atlantico/blob/main/README.md), y la guía para presentarlo en [GUIA-EXPOSICION.md](GUIA-EXPOSICION.md).

**Opción A (recomendada): todo con Docker.** Solo requiere Docker Desktop.

1. Instalar Docker Desktop y abrirlo hasta que diga "Engine running".
2. Descargar el proyecto y abrir una terminal en su carpeta.
3. Encender todo: `docker compose up -d --build`. Las películas de ejemplo se cargan solas la primera vez.
4. Abrir http://localhost:3000.

**Opción B: para programar.** Requiere Docker Desktop y Node.js 18 o superior.

1. `npm install`
2. Copiar `.env.example` como `.env`.
3. Encender la infraestructura: `docker compose up -d mongo rabbitmq mailpit`.
4. Encender los tres microservicios: `npm start`.

| Dirección | Qué es |
| --- | --- |
| http://localhost:3000 | Página de Cine Atlántico y API REST |
| http://localhost:8025 | Buzón de correos de prueba (Mailpit) |
| http://localhost:15672 | Panel de RabbitMQ (usuario y contraseña `guest`) |
| http://localhost:3002/estadisticas | Estadísticas del servicio de reportes |

| Variable | Valor por defecto | Significado |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/cine` | Base de datos del servicio de boletos |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672` | Dirección de RabbitMQ |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | Servidor de correo (Mailpit) |
| `REPORTES_MONGODB_URI` | `mongodb://127.0.0.1:27017/cine_reportes` | Base de datos del servicio de reportes |
| `REPORTES_URL` | `http://localhost:3002` | Dirección del servicio de reportes |
| `PORT` / `REPORTES_PORT` | `3000` / `3002` | Puertos de los servicios |
| `ADMIN_KEY` | `admin123` | Clave del panel de Administración |

## 12. Pruebas automáticas

Las 12 pruebas de la carpeta `test/` pasan contra MongoDB 7 y RabbitMQ 3. Se ejecutan con `npm test`, definiendo `MONGODB_URI_TEST` y `RABBITMQ_URL_TEST`; sin `RABBITMQ_URL_TEST`, las 2 pruebas que necesitan RabbitMQ se omiten.

| Prueba | Qué comprueba |
| --- | --- |
| Algoritmo de asignación | Elige asientos en la misma fila, no junta asientos separados por un pasillo y responde "sin cupo" cuando no hay espacio |
| Cartelera | La ruta de películas responde con las películas cargadas |
| Compra manual | La compra se crea; un asiento ya vendido se rechaza con 409 y no deja asientos reservados a medias |
| Compras simultáneas | 15 personas compran el mismo asiento al mismo tiempo: exactamente 1 lo consigue y 14 reciben 409 |
| Asignación automática simultánea | 8 compras automáticas de 3 boletos a la vez reciben 24 asientos distintos, sin repetidos |
| Validaciones | Rechaza asientos inexistentes, asientos repetidos, email inválido y más de 10 boletos |
| Cancelación | Exige el email correcto, libera los asientos y no permite cancelar dos veces |
| Administración | Exige la clave, crea funciones, rechaza horarios encimados y genera el reporte |
| Correos | El correo de compra lleva un código QR (imagen PNG) por boleto, y el de cancelación menciona los asientos liberados |
| Idempotencia en reportes | Un evento repetido se cuenta una sola vez y las cancelaciones restan la venta |
| Patrón outbox | Sin conexión a RabbitMQ el evento queda guardado en MongoDB y se reenvía al conectar |
| Publicación de eventos | La compra y la cancelación publican `compra.creada` y `compra.cancelada` con los datos correctos |

Además, se comprobó con el sistema completo en Docker:
- el recorrido de la página (comprar, consultar boletos y Administración con estadísticas) sin errores;
- que con el servicio de notificaciones apagado la venta sigue, el mensaje espera en la cola y el correo llega al encenderlo;
- que con RabbitMQ apagado la compra funciona, el evento queda pendiente y se reenvía al volver;
- que un mensaje inválido se reintenta una vez y termina en `notificaciones.fallidos`.

## 13. Limitaciones y posibles mejoras

El sistema está pensado como proyecto académico y de demostración; antes de usarlo con clientes reales habría que resolver estos puntos.

| Limitación actual | Posible mejora |
| --- | --- |
| El pago es simulado: solo se registra "tarjeta" o "efectivo" | Integrar una pasarela de pago como Stripe o Mercado Pago, como otro microservicio que escuche los eventos |
| Los correos llegan a un buzón de prueba (Mailpit) | Configurar un servidor SMTP real o un servicio de correo transaccional |
| El administrador entra con una sola clave compartida (`ADMIN_KEY`) | Cuentas de usuario con contraseña cifrada y sesiones (por ejemplo, JWT) |
| RabbitMQ usa el usuario de ejemplo `guest` | Crear usuarios propios con contraseña y permisos mínimos |
| No hay reserva temporal: los asientos solo se apartan al pagar | Bloquear los asientos unos minutos mientras el cliente llena el formulario |
| El mapa no se actualiza solo si otra persona compra | Actualización en tiempo real con WebSockets, alimentada por los mismos eventos |
| La compra y el evento pendiente se guardan en dos pasos | Usar transacciones de MongoDB (requieren un replica set) |
| No hay control de cantidad de peticiones | Agregar límite de peticiones y HTTPS al publicarlo en internet |
