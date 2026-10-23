<p align="center"><img src="public/logo.svg" alt="Logo de Cine Atlántico" width="120"></p>

<h1 align="center">Cine Atlántico</h1>
<p align="center">Compra y asignación de boletos de cine</p>

Una página web para comprar boletos de cine. En ella puedes:

- ver la cartelera con los horarios,
- elegir tus asientos en un mapa de la sala, o pedir que el sistema elija los mejores por ti,
- recibir tus boletos con un código,
- consultar o cancelar tus compras.

También tiene un panel de administración para agregar películas, salas y funciones y para ver las ventas.

**Películas en cartelera:** Star Wars, Jurassic Park, Harry Potter, Minions, Parasite y Obsesión.

![Mapa de asientos](docs/seleccion.png)

---

## Índice

1. [¿Qué necesito?](#qué-necesito)
2. [Paso 1: Instalar Node.js](#paso-1-instalar-nodejs)
3. [Paso 2: Descargar el proyecto](#paso-2-descargar-el-proyecto)
4. [Paso 3: Abrir una terminal en la carpeta del proyecto](#paso-3-abrir-una-terminal-en-la-carpeta-del-proyecto)
5. [Paso 4: Instalar las dependencias](#paso-4-instalar-las-dependencias)
6. [Paso 5: Preparar la base de datos MongoDB](#paso-5-preparar-la-base-de-datos-mongodb)
7. [Paso 6: Crear el archivo de configuración `.env`](#paso-6-crear-el-archivo-de-configuración-env)
8. [Paso 7: Cargar las películas de ejemplo](#paso-7-cargar-las-películas-de-ejemplo)
9. [Paso 8: Encender el programa](#paso-8-encender-el-programa)
10. [Cómo usar el programa](#cómo-usar-el-programa)
11. [Agregar las imágenes de cartelera (pósters)](#agregar-las-imágenes-de-cartelera-pósters)
12. [Apagar y volver a encender](#apagar-y-volver-a-encender)
13. [Solución de problemas](#solución-de-problemas)
14. [Para curiosos: cómo funciona por dentro](#para-curiosos-cómo-funciona-por-dentro)

---

## ¿Qué necesito?

| Programa | ¿Para qué sirve? | ¿Cuesta? |
|---|---|---|
| **Node.js** | Ejecuta el programa (el "motor") | Gratis |
| **MongoDB** | La base de datos donde se guardan películas, funciones y compras | Gratis |
| Un navegador (Chrome, Edge, Firefox…) | Para usar la página | Gratis |

> **¿Qué es una "terminal"?** Es una ventana donde escribes comandos en texto. En Windows se llama **Símbolo del sistema** o **PowerShell**; en Mac y Linux se llama **Terminal**. En esta guía, todo lo que aparece en un recuadro gris así:
> ```
> npm start
> ```
> es un comando: lo escribes (o lo copias y pegas) en la terminal y presionas **Enter**.

---

## Paso 1: Instalar Node.js

1. Entra a **https://nodejs.org/es**.
2. Descarga la versión que dice **LTS** (es la más estable).
3. Abre el instalador y da clic en **Siguiente** en todas las pantallas. Las opciones que vienen marcadas están bien.
4. **Comprueba que quedó instalado:** abre una terminal **nueva** y escribe:
   ```
   node -v
   ```
   Debe aparecer un número de versión, por ejemplo `v22.11.0`. Después escribe:
   ```
   npm -v
   ```
   También debe aparecer un número, por ejemplo `10.9.0`.

> **Importante:** si dice *"node no se reconoce como un comando"*, cierra la terminal, abre una nueva y vuelve a intentar. Si sigue igual, reinicia la computadora.

---

## Paso 2: Descargar el proyecto

Elige **una** de estas dos formas:

- **Forma fácil (sin Git):** descarga el proyecto como archivo **.zip** y descomprímelo (clic derecho → *Extraer todo*). Guarda la carpeta en un lugar fácil de encontrar, por ejemplo en el **Escritorio**.
- **Con Git** (si ya lo sabes usar):
  ```
  git clone <url-del-repositorio> cine
  ```

Al final debes tener una carpeta llamada **`cine`** que contiene, entre otros, los archivos `package.json` y `README.md`.

---

## Paso 3: Abrir una terminal en la carpeta del proyecto

Todos los comandos siguientes deben ejecutarse **dentro de la carpeta `cine`**.

**En Windows:**
1. Abre la carpeta `cine` en el Explorador de archivos.
2. Da clic en la barra de direcciones (arriba, donde aparece la ruta de la carpeta).
3. Escribe `cmd` y presiona **Enter**. Se abrirá una terminal que ya está dentro de la carpeta.

**En Mac:**
1. Abre la app **Terminal** (búscala con `Cmd + Espacio`).
2. Escribe `cd ` (con un espacio al final), **arrastra la carpeta `cine`** a la ventana de la Terminal y presiona **Enter**.

**En Linux:** clic derecho dentro de la carpeta → *Abrir en una terminal*.

**Comprueba que estás en el lugar correcto:** escribe `dir` (Windows) o `ls` (Mac/Linux). En la lista debe aparecer `package.json`.

---

## Paso 4: Instalar las dependencias

Las dependencias son piezas de código que usa el programa. Se descargan automáticamente con:

```
npm install
```

Espera a que termine; puede tardar uno o dos minutos. Al final verás algo como `added 120 packages`. Aparecerá una carpeta nueva llamada `node_modules`: **no la borres ni la modifiques**.

> Los mensajes amarillos que dicen `WARN` o `npm notice` son normales y puedes ignorarlos.

---

## Paso 5: Preparar la base de datos MongoDB

MongoDB es una base de datos **no relacional** (NoSQL): guarda la información como documentos parecidos a fichas, no como tablas. Elige **una** de estas opciones:

### Opción A (recomendada): instalar MongoDB en tu computadora

**Windows**
1. Entra a **https://www.mongodb.com/try/download/community**.
2. Deja seleccionada la versión más reciente, plataforma **Windows** y paquete **msi**. Da clic en **Download**.
3. Abre el instalador:
   - Elige **Complete**.
   - Deja marcada la casilla **"Install MongoD as a Service"**. Así MongoDB se enciende solo cada vez que prendes la computadora.
   - Puedes dejar marcado **MongoDB Compass**: es una aplicación para ver los datos guardados (opcional).
4. Da clic en **Siguiente** hasta terminar. ¡Listo! MongoDB ya está funcionando.

**Mac** (necesitas tener [Homebrew](https://brew.sh/es/) instalado)
```
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):** sigue la guía oficial en https://www.mongodb.com/docs/manual/administration/install-on-linux/

Con esta opción **no necesitas cambiar nada** en el Paso 6.

### Opción B: usar MongoDB Atlas (en internet, sin instalar nada)

1. Crea una cuenta gratis en **https://www.mongodb.com/cloud/atlas/register**.
2. Crea un cluster y elige el plan **M0 – Free** (gratis para siempre). Puedes dejar el proveedor y la región que vienen por defecto.
3. Atlas te pedirá crear un **usuario de base de datos**. Escribe un nombre (por ejemplo `cineuser`) y una contraseña **sin caracteres especiales** como `@`, `#` o `/`. **Anótalos.**
4. En **Network Access** (acceso de red), da clic en **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`). Esta opción solo es adecuada para pruebas.
5. Ve a **Database** → botón **Connect** → **Drivers**. Copia la dirección que aparece; se ve así:
   ```
   mongodb+srv://cineuser:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
6. Guarda esa dirección; la usarás en el Paso 6.

### Opción C: con Docker (solo si ya usas Docker)
```
docker compose up -d
```

---

## Paso 6: Crear el archivo de configuración `.env`

El archivo `.env` le dice al programa **dónde está la base de datos**. Ya existe una plantilla llamada `.env.example`; solo hay que copiarla con el nombre `.env`.

En la terminal (dentro de la carpeta `cine`) escribe:

- **Windows:**
  ```
  copy .env.example .env
  ```
- **Mac / Linux:**
  ```
  cp .env.example .env
  ```

**Si elegiste la Opción A o C,** no tienes que hacer nada más.

**Si elegiste la Opción B (Atlas):** abre el archivo `.env` con el Bloc de notas o cualquier editor de texto y cambia la línea `MONGODB_URI` por tu dirección de Atlas. Haz dos cambios a esa dirección:
1. Reemplaza `<db_password>` por tu contraseña. Borra también los símbolos `<` y `>`.
2. Agrega **`cine`** justo después de `.mongodb.net/`.

Ejemplo final:
```
MONGODB_URI=mongodb+srv://cineuser:MiClave123@cluster0.abcde.mongodb.net/cine?retryWrites=true&w=majority
PORT=3000
ADMIN_KEY=admin123
```

| Variable | Significado |
|---|---|
| `MONGODB_URI` | Dirección de la base de datos |
| `PORT` | Puerto de la página (se abre en `http://localhost:3000`) |
| `ADMIN_KEY` | Contraseña del panel de Administración. **Cámbiala** si vas a compartir el programa |

> **Consejo:** en Windows, si no ves el archivo `.env` en el Explorador, activa *Vista → Mostrar → Extensiones de nombre de archivo* y *Elementos ocultos*.

---

## Paso 7: Cargar las películas de ejemplo

Este comando llena la base de datos con **3 salas**, **6 películas** y funciones para hoy y los próximos 2 días:

```
npm run seed
```

Debe aparecer:
```
Datos cargados: 3 salas, 6 películas, 45 funciones
```
(El número de funciones puede ser menor si ya es tarde, porque no se crean funciones con horarios que ya pasaron.)

> **Cuidado:** este comando **borra todo** lo que haya en la base de datos (incluidas las compras) y vuelve a empezar desde cero. Úsalo solo la primera vez o cuando quieras reiniciar todo.

---

## Paso 8: Encender el programa

```
npm start
```

Cuando aparezca este mensaje, el programa ya está encendido:
```
MongoDB conectado: ...
Cine listo en http://localhost:3000
```

Ahora abre tu navegador y entra a **http://localhost:3000**

> **Importante:** no cierres la terminal mientras usas el programa; si la cierras, la página deja de funcionar.

---

## Cómo usar el programa

### Comprar boletos
1. En **Cartelera**, busca la película que quieres ver y da clic en un **horario**.
2. Elige tus asientos de una de estas dos formas:
   - **Tú eliges:** da clic en los asientos grises del mapa. Se pondrán **verdes**. Si das clic otra vez en un asiento verde, lo quitas de tu selección.
   - **Automático:** escribe cuántos boletos quieres y presiona **"Elegir mejores asientos"**. El sistema busca lugares juntos, en el centro y a buena distancia de la pantalla.
3. Escribe tu **nombre** y **email**, elige el método de pago y presiona **Comprar**.
4. Verás tus boletos. **Anota el código de compra** (por ejemplo `CIN-U3B4A4`).

Colores del mapa: **gris** = disponible · **gris con borde naranja** = VIP (cuesta un poco más) · **naranja** = tu selección · **negro** = vendido.

### Consultar o cancelar una compra
1. Ve a **Mis boletos**.
2. Escribe tu **código de compra** o tu **email** y presiona **Buscar**.
3. Para cancelar, presiona **Cancelar compra** y confirma con tu email. Los asientos vuelven a quedar disponibles para otras personas.

### Administración
1. Ve a **Administración** y escribe la clave (por defecto **`admin123`**).
2. Ahí puedes:
   - agregar **películas** nuevas, con su imagen de póster si quieres (ver la siguiente sección),
   - crear **salas** con el número de filas y asientos, pasillos y filas VIP,
   - programar **funciones**. El sistema no te deja poner dos funciones a la misma hora en la misma sala,
   - ver el **reporte de ventas**: boletos vendidos, ingresos y qué tan llena está cada función.

---

## Agregar las imágenes de cartelera (pósters)

Cada película puede mostrar su póster en la cartelera. Mientras no agregues las imágenes, la página muestra un **póster genérico** de Cine Atlántico con el nombre de la película, así que todo funciona desde el principio.

### Para las 6 películas incluidas

1. Busca en internet el póster de cada película. Por ejemplo, en Google Imágenes o en https://www.themoviedb.org: busca la película, da clic en el póster, luego clic derecho sobre la imagen y elige **Guardar imagen como...**.
2. Guarda cada imagen en la carpeta **`cine/public/posters/`** con **exactamente** estos nombres:

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
3. Recarga la página en el navegador (tecla **F5**). No hace falta reiniciar el programa.

> **Importante:** si cargaste las películas con una versión anterior del proyecto que no tenía pósters, ejecuta una vez `npm run seed` para que cada película quede asociada a su imagen. Recuerda que este comando borra las compras.

> **Consejo:** en Windows, si no ves la extensión (`.jpg`) de los archivos, activa *Vista → Mostrar → Extensiones de nombre de archivo* para comprobar que el nombre está bien escrito. Un error común es que el archivo quede como `minions.jpg.jpg`.

### Para películas nuevas (desde Administración)

En el formulario **Nueva película** hay un campo **Imagen del póster (opcional)**. Puedes escribir:

- una imagen de la carpeta `posters`: guarda el archivo, por ejemplo `public/posters/mi-pelicula.jpg`, y escribe `/posters/mi-pelicula.jpg`, **o**
- la dirección completa de una imagen en internet, por ejemplo `https://.../poster.jpg`. Ten en cuenta que, si esa página borra la imagen, dejará de verse.

Si dejas el campo vacío, se usa el póster genérico.

---

## Apagar y volver a encender

- **Para apagar:** en la terminal donde está corriendo el programa, presiona **`Ctrl + C`**.
- **Para volver a encenderlo otro día:**
  1. Abre una terminal en la carpeta `cine` (Paso 3).
  2. Escribe `npm start`.
  3. Entra a http://localhost:3000

  **No** necesitas repetir `npm install` ni `npm run seed`. Tus compras siguen guardadas.

> **Consejo:** las funciones de ejemplo son de los próximos 3 días. Si pasan varios días y la cartelera aparece vacía, ejecuta `npm run seed` para generar funciones nuevas.

---

## Solución de problemas

| Mensaje o problema | Qué significa y cómo arreglarlo |
|---|---|
| `'node' / 'npm' no se reconoce como un comando` | Node.js no está instalado o la terminal se abrió antes de instalarlo. Cierra la terminal y abre una nueva; si sigue igual, reinicia la computadora o reinstala Node.js (Paso 1). |
| `npm ERR! enoent ... package.json` | No estás dentro de la carpeta `cine`. Repite el Paso 3. |
| `No se pudo conectar a MongoDB: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB no está encendido. **Windows:** presiona `Win + R`, escribe `services.msc`, busca **MongoDB Server**, clic derecho → **Iniciar**. **Mac:** `brew services start mongodb-community`. |
| `bad auth : authentication failed` (Atlas) | El usuario o la contraseña en `.env` son incorrectos. Revisa que borraste los símbolos `< >`. |
| `Could not connect to any servers in your MongoDB Atlas cluster` | Atlas no permite conectarse desde tu red. Repite el punto 4 de la Opción B (Network Access). |
| `Error: listen EADDRINUSE: address already in use :::3000` | El programa ya está abierto en otra terminal, u otro programa usa el puerto 3000. Cierra la otra terminal, o cambia `PORT=3001` en `.env` y entra a http://localhost:3001 |
| La cartelera dice "No hay funciones programadas" | Las funciones de ejemplo ya pasaron. Ejecuta `npm run seed`. |
| La página no carga en el navegador | Revisa que la terminal muestre `Cine listo en http://localhost:3000` y que no la hayas cerrado. |
| "Clave de administrador incorrecta" | Usa el valor de `ADMIN_KEY` que está en tu archivo `.env` (por defecto `admin123`). |
| No aparece el póster que agregué | Revisa que el archivo esté en `public/posters/` y que el nombre sea exactamente el de la tabla, en minúsculas y sin `.jpg.jpg`. Luego recarga con **Ctrl + F5**. |
| "Asientos ya vendidos: …" al comprar | Alguien más compró esos asientos antes que tú. El mapa se actualiza solo; elige otros asientos. |

---

## Para curiosos: cómo funciona por dentro

### Estructura de carpetas
```
cine/
├── .env.example          ← plantilla de configuración
├── package.json          ← lista de dependencias y comandos (npm start, npm run seed…)
├── docker-compose.yml    ← para levantar MongoDB con Docker (opcional)
├── src/                  ← el servidor (backend)
│   ├── server.js         ← punto de entrada: conecta a MongoDB y enciende la web
│   ├── app.js            ← configuración de Express y manejo de errores
│   ├── seed.js           ← datos de ejemplo (películas, salas, funciones)
│   ├── asignacion.js     ← algoritmo que elige los mejores asientos
│   ├── servicioCompras.js← lógica de compra y cancelación
│   ├── models/           ← forma de los datos en MongoDB
│   └── routes/           ← direcciones de la API (públicas y de administración)
├── public/               ← la página web (frontend): index.html, app.js, styles.css, logo.svg
│   └── posters/          ← imágenes de cartelera de cada película
└── test/                 ← pruebas automáticas
```

### Cómo se guardan los datos (colecciones de MongoDB)
```
peliculas  { titulo, genero, clasificacion, duracionMin, sinopsis, activa }
salas      { nombre, filas, asientosPorFila, pasillos[], asientosDeshabilitados[], filasVip[], recargoVip }
funcions   { pelicula→, sala→, inicio, fin, precio, formato, idioma, asientosOcupados: ["E5","E6",…] }
compras    { codigo, funcion→, cliente{nombre,email}, boletos:[{codigo, asiento, precio, vip}],
             total, metodoPago, asignacion, estado: pagada|cancelada }
```
- Los **boletos van dentro de la compra**: una sola lectura trae la compra completa.
- Los **asientos vendidos se guardan dentro de la función**: el mapa se dibuja con una sola consulta.

> Para ver estos datos, abre **MongoDB Compass**, conéctate a `mongodb://127.0.0.1:27017` y entra a la base de datos `cine`.

### ¿Cómo se evita vender el mismo asiento dos veces?
MongoDB garantiza que modificar **un solo documento** es una operación atómica (indivisible). La reserva se hace en un solo paso: *"agrega estos asientos a la función **solo si** ninguno está ya vendido"*:

```js
Funcion.findOneAndUpdate(
  { _id, inicio: { $gt: ahora }, asientosOcupados: { $nin: asientosPedidos } },
  { $push: { asientosOcupados: { $each: asientosPedidos } } }
)
```
Si dos personas compran el mismo asiento al mismo tiempo, solo una lo consigue; la otra recibe el aviso de que el asiento ya está vendido.

### Algoritmo de "mejores asientos"
1. Busca N asientos **juntos en la misma fila**. Un pasillo separa los bloques.
2. Les da una calificación según qué tan cerca están de la fila ideal (~60% hacia el fondo) y del centro de la pantalla, y elige el mejor.
3. Si no hay N asientos juntos, elige los N mejores asientos sueltos.

### API REST
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/peliculas` | Cartelera con funciones y disponibilidad |
| GET | `/api/funciones/:id` | Detalle de la función, mapa de la sala y asientos ocupados |
| GET | `/api/funciones/:id/sugerencia?cantidad=3` | Mejores asientos sugeridos (no reserva nada) |
| POST | `/api/compras` | `{ funcionId, cliente:{nombre,email}, asientos:["E5","E6"] }` **o** `{ …, cantidad: 2 }` |
| GET | `/api/compras/:codigo` | Consultar una compra |
| GET | `/api/compras?email=…` | Compras de un cliente |
| POST | `/api/compras/:codigo/cancelar` | `{ email }`: cancela la compra y libera los asientos |
| GET/POST | `/api/admin/peliculas`, `/api/admin/salas` | Requiere el header `x-admin-key` |
| POST | `/api/admin/funciones` | `{ peliculaId, salaId, inicio, precio, formato, idioma }` |
| DELETE | `/api/admin/funciones/:id` | Solo si la función no tiene ventas |
| GET | `/api/admin/reporte` | Ventas por función |

### Pruebas automáticas
```
npm test
```
Este comando intenta usar un MongoDB temporal en memoria; la primera vez lo descarga de internet. Si ya tienes MongoDB encendido, puedes usarlo en su lugar:

- **Mac / Linux:** `MONGODB_URI_TEST=mongodb://127.0.0.1:27017/cine_test npm test`
- **Windows (cmd):** `set "MONGODB_URI_TEST=mongodb://127.0.0.1:27017/cine_test" && npm test`

Las pruebas cubren: compra manual, asientos ocupados, 15 compras simultáneas del mismo asiento (solo una gana), asignación automática sin asientos repetidos, validaciones, cancelación y administración.

### Comando extra para desarrollo
```
npm run dev
```
Hace lo mismo que `npm start`, pero reinicia el servidor solo cada vez que guardas un cambio en el código.
