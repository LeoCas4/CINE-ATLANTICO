<p align="center"><img src="servicios/boletos/public/logo.svg" alt="Logo de Cine Atlántico" width="120"></p>

<h1 align="center">Cine Atlántico</h1>
<p align="center">Compra y asignación de boletos de cine con microservicios, MongoDB y RabbitMQ</p>

Una página web para comprar boletos de cine. En ella puedes:

- ver la cartelera con los horarios,
- elegir tus asientos en un mapa de la sala, o pedir que el sistema elija los mejores por ti,
- recibir tus boletos **por correo, con un código QR por boleto**,
- consultar o cancelar tus compras.

También tiene un panel de administración para agregar películas, salas y funciones, y para ver las ventas y las estadísticas en vivo.

El sistema está dividido en **tres microservicios** (boletos, notificaciones y reportes) que se comunican con mensajes a través de **RabbitMQ**.

**Películas en cartelera:** Star Wars, Jurassic Park, Harry Potter, Minions, Parasite y Obsesión.

![Mapa de asientos](docs/seleccion.png)

**Documentación técnica completa** (arquitectura, modelo de datos, mensajería, API y pruebas, con diagramas): [docs/DOCUMENTACION.md](docs/DOCUMENTACION.md). También está en [Word](docs/Cine-Atlantico-Documentacion.docx) y [PDF](docs/Cine-Atlantico-Documentacion.pdf).

**Guía para presentar el proyecto:** [docs/GUIA-EXPOSICION.md](docs/GUIA-EXPOSICION.md)

---

## Índice

1. [¿Qué necesito?](#qué-necesito)
2. [Opción A (recomendada): encender todo con Docker](#opción-a-recomendada-encender-todo-con-docker)
3. [Opción B: para programar (Node.js + Docker)](#opción-b-para-programar-nodejs--docker)
4. [Las páginas del sistema](#las-páginas-del-sistema)
5. [Cómo usar el programa](#cómo-usar-el-programa)
6. [Agregar las imágenes de cartelera (pósters)](#agregar-las-imágenes-de-cartelera-pósters)
7. [Apagar, volver a encender y reiniciar los datos](#apagar-volver-a-encender-y-reiniciar-los-datos)
8. [Solución de problemas](#solución-de-problemas)
9. [Ramas del repositorio (Git)](#ramas-del-repositorio-git)
10. [Para curiosos: cómo funciona por dentro](#para-curiosos-cómo-funciona-por-dentro)

---

## ¿Qué necesito?

| Programa | ¿Para qué sirve? | ¿Cuándo lo necesito? | ¿Cuesta? |
|---|---|---|---|
| **Docker Desktop** | Enciende MongoDB, RabbitMQ, el buzón de correos y los microservicios, sin instalarlos uno por uno | **Siempre** | Gratis para uso personal y educativo |
| **Node.js** (versión LTS) | Ejecuta el código directamente en tu computadora | Solo en la **Opción B** | Gratis |
| Un navegador (Chrome, Edge, Firefox…) | Para usar la página | Siempre | Gratis |
| Git | Para descargar el proyecto con un comando | Opcional | Gratis |

> **¿Qué es Docker?** Es un programa que ejecuta otros programas dentro de "contenedores": cajas aisladas que ya traen todo lo que necesitan. Gracias a él no tienes que instalar MongoDB ni RabbitMQ en tu computadora: Docker los descarga y los enciende por ti.

> **¿Qué es una "terminal"?** Es una ventana donde escribes comandos en texto. En Windows se llama **Símbolo del sistema** o **PowerShell**; en Mac y Linux se llama **Terminal**. Todo lo que aparece en un recuadro gris así:
> ```
> docker compose up -d --build
> ```
> es un comando: lo escribes (o lo copias y pegas) en la terminal y presionas **Enter**.

---

## Opción A (recomendada): encender todo con Docker

Con esta opción **solo necesitas instalar Docker Desktop**. Un solo comando enciende los 6 componentes del sistema.

### Paso 1: Instalar Docker Desktop

**Windows**
1. Entra a **https://www.docker.com/products/docker-desktop/** y descarga **Docker Desktop para Windows**.
2. Abre el instalador y deja marcada la opción **"Use WSL 2"** (la recomendada). Da clic en **OK** hasta terminar.
3. **Reinicia la computadora** si el instalador lo pide.
4. Abre **Docker Desktop** desde el menú de inicio. La primera vez te pedirá aceptar los términos; puedes omitir el inicio de sesión ("Skip").
5. Espera a que abajo a la izquierda diga **"Engine running"** (motor encendido).

> Si Docker Desktop te pide instalar o actualizar **WSL**, acepta y sigue las instrucciones que muestra; después reinicia.

**Mac**
1. Descarga **Docker Desktop para Mac** desde la misma página. Elige **Apple Silicon** (chips M1, M2, M3…) o **Intel** según tu Mac (lo ves en el menú de la manzana → *Acerca de esta Mac*).
2. Abre el archivo `.dmg` y arrastra Docker a **Aplicaciones**.
3. Abre **Docker** desde Aplicaciones y espera a que diga **"Engine running"**.

**Linux:** sigue la guía oficial en https://docs.docker.com/desktop/setup/install/linux/

**Comprueba que quedó instalado:** abre una terminal y escribe:
```
docker --version
docker compose version
```
Deben aparecer dos números de versión.

### Paso 2: Descargar el proyecto

Elige **una** de estas dos formas:

- **Sin Git:** entra a https://github.com/LeoCas4/Cine-Atlantico, da clic en el botón verde **Code** y luego en **Download ZIP**. Descomprime el archivo (clic derecho → *Extraer todo*) y guarda la carpeta en un lugar fácil de encontrar, por ejemplo en el **Escritorio**.
- **Con Git:**
  ```
  git clone https://github.com/LeoCas4/Cine-Atlantico.git cine
  ```

Al final tendrás una carpeta con los archivos `docker-compose.yml`, `package.json` y `README.md`, entre otros. En esta guía la llamamos **`cine`**; si la descargaste como ZIP se llamará `Cine-Atlantico-main`, y funciona igual.

### Paso 3: Abrir una terminal en la carpeta del proyecto

**Windows:** abre la carpeta en el Explorador de archivos, da clic en la barra de direcciones (arriba), escribe `cmd` y presiona **Enter**.

**Mac:** abre **Terminal**, escribe `cd ` (con un espacio al final), **arrastra la carpeta** a la ventana y presiona **Enter**.

**Linux:** clic derecho dentro de la carpeta → *Abrir en una terminal*.

**Comprueba que estás en el lugar correcto:** escribe `dir` (Windows) o `ls` (Mac/Linux). En la lista debe aparecer `docker-compose.yml`.

### Paso 4: Encender el sistema

Con **Docker Desktop abierto**, escribe:
```
docker compose up -d --build
```

- La **primera vez** tarda de 2 a 5 minutos: Docker descarga MongoDB, RabbitMQ y Mailpit, y prepara los microservicios. Las siguientes veces tarda segundos.
- Cuando termine, comprueba que todo está encendido:
  ```
  docker compose ps
  ```
  Deben aparecer **6 servicios**: `mongo`, `rabbitmq`, `mailpit`, `boletos`, `notificaciones` y `reportes`, todos con estado **Up** (encendido).
- Las películas de ejemplo se cargan solas la primera vez.

> **Espera unos 15 segundos** después de encender antes de comprar: RabbitMQ tarda un poco en estar listo, y los servicios se conectan solos en cuanto lo está.

### Paso 5: Abrir la página

Entra a **http://localhost:3000** en tu navegador. ¡Listo! En [Las páginas del sistema](#las-páginas-del-sistema) están las demás direcciones.

> No necesitas dejar ninguna terminal abierta: los servicios siguen encendidos en Docker aunque la cierres.

---

## Opción B: para programar (Node.js + Docker)

Usa esta opción si vas a modificar el código: los tres microservicios corren en tu computadora con Node.js y ves sus mensajes en la terminal, mientras Docker solo enciende la infraestructura (MongoDB, RabbitMQ y Mailpit).

1. **Instala Docker Desktop** (Paso 1 de la Opción A) y **Node.js**: entra a **https://nodejs.org/es**, descarga la versión **LTS** e instálala con las opciones por defecto. Comprueba con `node -v` y `npm -v`.
2. **Descarga el proyecto y abre una terminal en su carpeta** (Pasos 2 y 3 de la Opción A).
3. **Instala las dependencias** (las librerías del proyecto):
   ```
   npm install
   ```
4. **Crea el archivo de configuración `.env`** copiando la plantilla:
   - Windows: `copy .env.example .env`
   - Mac / Linux: `cp .env.example .env`

   Los valores de la plantilla ya funcionan; no tienes que cambiar nada.
5. **Enciende solo la infraestructura** con Docker:
   ```
   docker compose up -d mongo rabbitmq mailpit
   ```
6. **Enciende los tres microservicios:**
   ```
   npm start
   ```
   Verás los mensajes de cada servicio con su nombre y un color distinto: `[boletos]`, `[notificaciones]` y `[reportes]`. Espera a que los tres digan **"Conectado a RabbitMQ"** y entra a **http://localhost:3000**.

> Con esta opción, **no cierres la terminal** de `npm start`: si la cierras, se apagan los tres servicios.

También puedes encender cada servicio por separado, en terminales distintas:

| Comando | Qué enciende |
|---|---|
| `npm run boletos` | Página web y API REST (puerto 3000) |
| `npm run notificaciones` | Servicio de correos |
| `npm run reportes` | Servicio de estadísticas (puerto 3002) |

---

## Las páginas del sistema

| Dirección | Qué es | Usuario / contraseña |
|---|---|---|
| **http://localhost:3000** | **Cine Atlántico**: la página para comprar boletos | Administración: clave `admin123` |
| **http://localhost:8025** | **Mailpit**: buzón de correos de prueba. Aquí llegan los correos con los boletos | No pide |
| **http://localhost:15672** | **Panel de RabbitMQ**: colas y mensajes en vivo | `guest` / `guest` |
| **http://localhost:3002/estadisticas** | **Servicio de reportes**: estadísticas en formato JSON | No pide |

> **Sobre los correos:** el servicio de notificaciones envía los correos a **Mailpit**, un buzón de prueba que vive en tu computadora. Los correos **no llegan a cuentas reales** (Gmail, Outlook…), así que puedes usar cualquier email al comprar. Para enviarlos de verdad bastaría con poner los datos de un servidor SMTP real en las variables `SMTP_*`.

---

## Cómo usar el programa

### Comprar boletos
1. En **Cartelera**, busca la película que quieres ver y da clic en un **horario**.
2. Elige tus asientos de una de estas dos formas:
   - **Tú eliges:** da clic en los asientos grises del mapa. Se pondrán **naranjas**. Si das clic otra vez en un asiento naranja, lo quitas de tu selección.
   - **Automático:** escribe cuántos boletos quieres y presiona **"Elegir mejores asientos"**. El sistema busca lugares juntos, en el centro y a buena distancia de la pantalla.
3. Escribe tu **nombre** y **email**, elige el método de pago y presiona **Comprar**.
4. Verás tus boletos con el **código de compra** (por ejemplo `CIN-U3B4A4`).
5. Abre **http://localhost:8025**: en unos segundos llega el correo con tus boletos y un **código QR por boleto**.

Colores del mapa: **gris** = disponible · **gris con borde naranja** = VIP (cuesta un poco más) · **naranja** = tu selección · **negro** = vendido.

### Consultar o cancelar una compra
1. Ve a **Mis boletos**.
2. Escribe tu **código de compra** o tu **email** y presiona **Buscar**.
3. Para cancelar, presiona **Cancelar compra** y confirma con tu email. Los asientos vuelven a quedar disponibles y llega un correo de cancelación a Mailpit.

### Administración
1. Ve a **Administración** y escribe la clave (por defecto **`admin123`**).
2. Ahí puedes:
   - agregar **películas** nuevas, con su imagen de póster si quieres,
   - crear **salas** con el número de filas y asientos, pasillos y filas VIP,
   - programar **funciones**. El sistema no te deja poner dos funciones a la misma hora en la misma sala,
   - ver el **reporte de ventas** por función: boletos vendidos, ingresos y ocupación,
   - ver las **estadísticas en vivo** que calcula el servicio de reportes a partir de los mensajes de RabbitMQ: compras, cancelaciones e ingresos por película.

### Ver los mensajes en RabbitMQ
1. Entra a **http://localhost:15672** con usuario `guest` y contraseña `guest`.
2. Abre la pestaña **Queues and Streams**. Verás las colas `notificaciones` y `reportes` (y sus colas `.fallidos`).
3. Cada compra o cancelación pasa por esas colas. Normalmente se vacían al instante porque los servicios procesan los mensajes enseguida.

---

## Agregar las imágenes de cartelera (pósters)

Cada película puede mostrar su póster en la cartelera. Mientras no agregues las imágenes, la página muestra un **póster genérico** de Cine Atlántico con el nombre de la película, así que todo funciona desde el principio.

### Para las 6 películas incluidas

1. Busca en internet el póster de cada película. Por ejemplo, en Google Imágenes o en https://www.themoviedb.org: busca la película, da clic en el póster, luego clic derecho sobre la imagen y elige **Guardar imagen como...**.
2. Guarda cada imagen en la carpeta **`servicios/boletos/public/posters/`** con **exactamente** estos nombres:

   | Película | Nombre del archivo |
   |---|---|
   | Star Wars | `star-wars.jpg` |
   | Jurassic Park | `jurassic-park.jpg` |
   | Harry Potter | `harry-potter.jpg` |
   | Minions | `minions.jpg` |
   | Parasite | `parasite.jpg` |
   | Obsesión | `obsesion.jpg` (sin acento) |

   - También funcionan imágenes **.png** o **.webp** con el mismo nombre, por ejemplo `minions.png`.
   - Escribe los nombres **en minúsculas** y con guion medio (`-`), sin espacios.
   - Lo ideal son imágenes verticales, como un póster real (por ejemplo, 400 × 600 píxeles).
3. Recarga la página en el navegador (tecla **F5**). No hace falta reiniciar nada, ni siquiera con Docker.

> **Consejo:** en Windows, si no ves la extensión (`.jpg`) de los archivos, activa *Vista → Mostrar → Extensiones de nombre de archivo* para comprobar que el nombre está bien escrito. Un error común es que el archivo quede como `minions.jpg.jpg`.

### Para películas nuevas (desde Administración)

En el formulario **Nueva película** hay un campo **Imagen del póster (opcional)**. Puedes escribir:

- una imagen de la carpeta `posters`: guarda el archivo, por ejemplo `servicios/boletos/public/posters/mi-pelicula.jpg`, y escribe `/posters/mi-pelicula.jpg`, **o**
- la dirección completa de una imagen en internet, por ejemplo `https://.../poster.jpg`.

Si dejas el campo vacío, se usa el póster genérico.

---

## Apagar, volver a encender y reiniciar los datos

Todos los comandos se escriben en una terminal abierta en la carpeta del proyecto.

| Quiero… | Opción A (Docker) | Opción B (Node.js) |
|---|---|---|
| **Apagar** | `docker compose stop` | `Ctrl + C` en la terminal de `npm start`, y después `docker compose stop` |
| **Volver a encender** | Abrir Docker Desktop y `docker compose up -d` | `docker compose up -d mongo rabbitmq mailpit` y `npm start` |
| **Generar funciones nuevas** (borra las compras) | `docker compose exec boletos node servicios/boletos/seed.js` | `npm run seed` |
| **Borrar todo y empezar de cero** | `docker compose down -v` y luego `docker compose up -d --build` | Igual que en la Opción A, para la infraestructura |
| **Ver los mensajes de un servicio** | `docker compose logs -f notificaciones` (cambia el nombre por `boletos` o `reportes`; sal con `Ctrl + C`) | Aparecen en la terminal de `npm start` |
| **Aplicar cambios del código** | `docker compose up -d --build` | Detener con `Ctrl + C` y volver a `npm start` |

Tus compras se guardan aunque apagues la computadora. Solo `docker compose down -v` las borra.

> **Consejo:** las funciones de ejemplo son de hoy y los próximos 2 días. Si pasan varios días y la cartelera aparece vacía, usa el comando de **Generar funciones nuevas**.

---

## Solución de problemas

| Mensaje o problema | Qué significa y cómo arreglarlo |
|---|---|
| `'docker' no se reconoce como un comando` | Docker Desktop no está instalado, o la terminal se abrió antes de instalarlo. Cierra la terminal y abre una nueva; si sigue igual, reinicia la computadora. |
| `Cannot connect to the Docker daemon` o `error during connect` | Docker Desktop no está abierto. Ábrelo y espera a que diga **"Engine running"**. |
| Docker Desktop pide **WSL** o dice que la virtualización está desactivada (Windows) | Acepta instalar o actualizar WSL y reinicia. Si dice que falta la virtualización, hay que activarla en el BIOS de la computadora (busca "activar virtualización" con la marca de tu computadora). |
| `no configuration file provided: not found` | No estás en la carpeta del proyecto. Repite el Paso 3. |
| `port is already allocated` o `address already in use` | Otro programa usa ese puerto, por ejemplo un MongoDB instalado aparte (27017) o una copia anterior del cine (3000). Apaga ese programa, o reinicia la computadora y vuelve a intentar. |
| La página no carga en http://localhost:3000 | Revisa con `docker compose ps` que `boletos` diga **Up**. Si acabas de encender, espera 15 segundos. Para ver el error: `docker compose logs boletos`. |
| No llega el correo a Mailpit | Revisa que `notificaciones` esté encendido (`docker compose ps`) y mira sus mensajes con `docker compose logs notificaciones`. Si el servicio estuvo apagado, el correo llega en cuanto se encienda: el mensaje esperó en la cola. |
| "El servicio de reportes no está disponible" en Administración | El servicio `reportes` está apagado. Enciéndelo con `docker compose up -d reportes` (o `npm run reportes` en la Opción B). La venta de boletos sigue funcionando aunque esté apagado. |
| Mensajes `RabbitMQ no disponible ... reintento` al encender | Es normal los primeros segundos: RabbitMQ aún está arrancando y los servicios reintentan solos. Si siguen después de un minuto, revisa que `rabbitmq` esté encendido. |
| La cartelera dice "No hay funciones programadas" | Las funciones de ejemplo ya pasaron. Usa el comando de **Generar funciones nuevas**. |
| "Clave de administrador incorrecta" | Usa `admin123`, o el valor de `ADMIN_KEY` en tu `.env` (Opción B) o en `docker-compose.yml` (Opción A). |
| "Asientos ya vendidos: …" al comprar | Alguien más compró esos asientos antes que tú. El mapa se actualiza solo; elige otros asientos. |
| (Opción B) `'node' / 'npm' no se reconoce como un comando` | Node.js no está instalado o la terminal se abrió antes de instalarlo. Abre una terminal nueva o reinicia. |
| (Opción B) `npm ERR! enoent ... package.json` | No estás dentro de la carpeta del proyecto. |

---

## Ramas del repositorio (Git)

El proyecto usa un flujo de trabajo con ramas, para que cada cambio se desarrolle por separado y se una cuando está terminado y probado:

| Rama | Para qué sirve |
|---|---|
| `main` | Versión estable, lista para usar y presentar. Solo recibe cambios desde `develop` |
| `develop` | Rama de integración: aquí se juntan las ramas de trabajo terminadas |
| `refactor/estructura-microservicios` | Reorganizó el código en la carpeta `servicios/` |
| `feature/mensajeria-rabbitmq` | Publicación de eventos en RabbitMQ y patrón outbox |
| `feature/servicio-notificaciones` | Microservicio de correos con códigos QR |
| `feature/servicio-reportes` | Microservicio de estadísticas |
| `feature/docker-compose` | Encender todo el sistema con Docker Compose |
| `test/pruebas-mensajeria` | Pruebas automáticas de la mensajería |
| `docs/microservicios` | Este README y la documentación de la versión 2 |

Versiones marcadas con etiquetas (*tags*): **`v1.0.0`** (sistema monolítico original) y **`v2.0.0`** (microservicios con RabbitMQ).

**Para hacer un cambio nuevo:**
```
git switch develop
git pull
git switch -c feature/nombre-del-cambio
# ... editar, probar ...
git add .
git commit -m "Describe aquí qué cambiaste"
git push -u origin feature/nombre-del-cambio
```
Después, en GitHub, abre un **Pull Request** de tu rama hacia `develop`.

---

## Para curiosos: cómo funciona por dentro

### Arquitectura

![Arquitectura de microservicios](docs/diagramas/arquitectura.png)

| Microservicio | Qué hace | Se comunica con |
|---|---|---|
| **Boletos** (`servicios/boletos/`) | Página web, API REST, reserva de asientos y compras. **Publica** eventos | Navegador (HTTP), MongoDB `cine`, RabbitMQ |
| **Notificaciones** (`servicios/notificaciones/`) | **Consume** los eventos y envía los correos con QR | RabbitMQ, Mailpit (SMTP) |
| **Reportes** (`servicios/reportes/`) | **Consume** los eventos y calcula estadísticas | RabbitMQ, MongoDB `cine_reportes`, HTTP `/estadisticas` |

### Eventos

| Evento | Cuándo se publica | Quién lo escucha | Qué datos lleva |
|---|---|---|---|
| `compra.creada` | Al completarse una compra | Notificaciones (correo con boletos) y Reportes (suma la venta) | Código, cliente, boletos, total, película, sala y horario |
| `compra.cancelada` | Al cancelar una compra | Notificaciones (correo de cancelación) y Reportes (resta la venta) | Los mismos datos, con estado `cancelada` |

Los eventos se publican en el exchange **`cine.eventos`** (tipo *topic*). Cada servicio tiene su propia cola suscrita a `compra.*`, así que **cada servicio recibe su propia copia** de cada evento.

### Técnicas de confiabilidad

- **La reserva de asientos no pasa por RabbitMQ:** sigue siendo una operación indivisible de MongoDB, porque el cliente necesita saber al instante si consiguió su asiento. La mensajería se usa para lo que ocurre **después** de la compra.
- **Patrón outbox:** si RabbitMQ no está disponible, el servicio de boletos guarda el evento en MongoDB (colección `eventospendientes`) y lo reenvía al recuperar la conexión. La venta nunca se detiene y no se pierde ningún evento.
- **Confirmaciones del publicador:** el servicio de boletos espera a que RabbitMQ confirme que guardó cada mensaje.
- **Mensajes y colas persistentes:** sobreviven a un reinicio de RabbitMQ.
- **Confirmación de procesamiento (*ack*):** un mensaje se borra de la cola solo cuando el servicio terminó de procesarlo. Si un servicio está apagado, sus mensajes esperan en la cola.
- **Reintento y cola de fallidos:** si procesar un mensaje falla, se reintenta una vez; si vuelve a fallar, pasa a la cola `<servicio>.fallidos` en lugar de perderse.
- **Idempotencia en reportes:** cada evento se guarda con su id único; si RabbitMQ entrega un mensaje repetido, no se cuenta dos veces.
- **Reconexión automática:** si RabbitMQ se reinicia, los servicios se reconectan solos.

### Estructura de carpetas
```
cine-atlantico/
├── docker-compose.yml       ← enciende todo el sistema
├── Dockerfile               ← imagen de los microservicios
├── package.json             ← dependencias y comandos (npm start, npm test…)
├── .env.example             ← plantilla de configuración (Opción B)
├── servicios/
│   ├── compartido/
│   │   └── rabbitmq.js      ← conexión, exchange, colas y reconexión
│   ├── boletos/             ← microservicio de boletos
│   │   ├── server.js        ← punto de entrada
│   │   ├── app.js           ← Express: rutas y manejo de errores
│   │   ├── servicioCompras.js ← compra atómica y cancelación; publica eventos
│   │   ├── mensajeria.js    ← publicación en RabbitMQ con patrón outbox
│   │   ├── asignacion.js    ← algoritmo de mejores asientos
│   │   ├── seed.js          ← datos de ejemplo
│   │   ├── models/          ← Pelicula, Sala, Funcion, Compra
│   │   ├── routes/          ← API pública y de administración
│   │   └── public/          ← página web, logo y posters/
│   ├── notificaciones/      ← microservicio de correos
│   │   ├── index.js         ← consume la cola y envía correos
│   │   └── plantillas.js    ← correos con códigos QR
│   └── reportes/            ← microservicio de estadísticas
│       ├── index.js         ← consume la cola y expone /estadisticas
│       └── estadisticas.js  ← registro de eventos y agregación
├── test/                    ← pruebas automáticas
└── docs/                    ← documentación, diagramas y capturas
```

### Bases de datos (MongoDB)
```
cine            ← servicio de boletos
  peliculas, salas, funcions, compras, eventospendientes
cine_reportes   ← servicio de reportes (su propia base de datos)
  movimientos   ← un documento por evento recibido
```
Cada microservicio tiene **su propia base de datos**: el servicio de reportes nunca lee la base del servicio de boletos; se entera de las ventas solo por los eventos.

### ¿Cómo se evita vender el mismo asiento dos veces?
La reserva se hace en un solo paso: *"agrega estos asientos a la función **solo si** ninguno está ya vendido"*.

```js
Funcion.findOneAndUpdate(
  { _id, inicio: { $gt: ahora }, asientosOcupados: { $nin: asientosPedidos } },
  { $push: { asientosOcupados: { $each: asientosPedidos } } }
)
```
Si dos personas compran el mismo asiento al mismo tiempo, solo una lo consigue; la otra recibe el aviso de que ya está vendido.

### API REST

**Servicio de boletos (puerto 3000)**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/peliculas` | Cartelera con funciones y disponibilidad |
| GET | `/api/funciones/:id` | Detalle de la función, mapa de la sala y asientos ocupados |
| GET | `/api/funciones/:id/sugerencia?cantidad=3` | Mejores asientos sugeridos (no reserva nada) |
| POST | `/api/compras` | `{ funcionId, cliente:{nombre,email}, asientos:["E5","E6"] }` **o** `{ …, cantidad: 2 }` |
| GET | `/api/compras/:codigo` | Consultar una compra |
| GET | `/api/compras?email=…` | Compras de un cliente |
| POST | `/api/compras/:codigo/cancelar` | `{ email }`: cancela la compra y libera los asientos |
| GET/POST | `/api/admin/peliculas`, `/api/admin/salas` | Requiere el encabezado `x-admin-key` |
| POST | `/api/admin/funciones` | `{ peliculaId, salaId, inicio, precio, formato, idioma }` |
| DELETE | `/api/admin/funciones/:id` | Solo si la función no tiene ventas |
| GET | `/api/admin/reporte` | Ventas por función |
| GET | `/api/admin/estadisticas` | Estadísticas del servicio de reportes |

**Servicio de reportes (puerto 3002)**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/estadisticas` | Compras, cancelaciones, boletos e ingresos por película, y los últimos eventos |
| GET | `/salud` | Indica si el servicio está encendido |

### Pruebas automáticas

Hay 12 pruebas en la carpeta `test/`. Necesitan MongoDB y RabbitMQ encendidos (Opción B, paso 5) y Node.js:

- Windows (PowerShell):
  ```
  $env:MONGODB_URI_TEST="mongodb://127.0.0.1:27017/cine_test"; $env:RABBITMQ_URL_TEST="amqp://guest:guest@localhost:5672"; npm test
  ```
- Mac / Linux:
  ```
  MONGODB_URI_TEST=mongodb://127.0.0.1:27017/cine_test RABBITMQ_URL_TEST=amqp://guest:guest@localhost:5672 npm test
  ```

Cubren: compra manual, asientos ocupados, **15 compras simultáneas del mismo asiento** (solo 1 gana), asignación automática sin asientos repetidos, validaciones, cancelación, administración, correos con QR, que un evento repetido no se cuente dos veces, el patrón outbox y la publicación de eventos. Sin `RABBITMQ_URL_TEST`, las 2 pruebas que necesitan RabbitMQ se omiten.
