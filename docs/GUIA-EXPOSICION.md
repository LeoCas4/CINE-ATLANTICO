# Guía para exponer Cine Atlántico

Esta guía explica qué preparar antes de la presentación, un guion de unos 12 minutos con las demostraciones en vivo, y las preguntas más probables sobre la mensajería entre microservicios.

---

## 1. Qué instalar en la computadora de la presentación

| Programa | ¿Es obligatorio? | Para qué |
|---|---|---|
| **Docker Desktop** | **Sí** | Enciende todo el sistema: MongoDB, RabbitMQ, el buzón de correos y los 3 microservicios |
| Un navegador (Chrome, Edge o Firefox) | Sí | Mostrar las páginas |
| Node.js (versión LTS) | No | Solo si quieres ejecutar las pruebas automáticas o mostrar los servicios con `npm start` |
| MongoDB Compass | No | Solo si quieres mostrar los datos guardados en la base de datos |

No necesitas instalar MongoDB ni RabbitMQ: Docker los descarga y los enciende. Los pasos de instalación están en el [README](../README.md#opción-a-recomendada-encender-todo-con-docker).

---

## 2. Un día antes (con internet)

La primera vez, Docker descarga varias imágenes. Hazlo antes para no depender del internet del salón.

1. Instala **Docker Desktop** y ábrelo hasta que diga **"Engine running"**.
2. Descarga el proyecto de GitHub y abre una terminal en su carpeta.
3. Enciende todo:
   ```
   docker compose up -d --build
   ```
4. Prueba el recorrido completo de la sección 4: compra un boleto, revisa el correo y las estadísticas.
5. (Opcional) Pon los pósters de las películas en `servicios/boletos/public/posters/`.
6. Apaga con `docker compose stop`. Lo descargado queda guardado en tu computadora.

---

## 3. El día de la presentación (5 minutos antes)

1. Abre **Docker Desktop** y espera a que diga **"Engine running"**.
2. En una terminal, dentro de la carpeta del proyecto:
   ```
   docker compose up -d
   ```
3. Si pasaron más de 2 días desde la última vez, genera funciones nuevas (borra las compras de prueba):
   ```
   docker compose exec boletos node servicios/boletos/seed.js
   ```
4. Comprueba que todo está encendido con `docker compose ps`: deben aparecer 6 servicios con estado **Up**.
5. Abre estas 4 pestañas en el navegador, en este orden:

| Pestaña | Dirección | Notas |
|---|---|---|
| 1. Cine Atlántico | http://localhost:3000 | |
| 2. Buzón de correos (Mailpit) | http://localhost:8025 | |
| 3. Panel de RabbitMQ | http://localhost:15672 | Entra con `guest` / `guest` y abre **Queues and Streams** |
| 4. Estadísticas del servicio de reportes | http://localhost:3002/estadisticas | Opcional: muestra el JSON del microservicio |

6. Deja la terminal abierta en la carpeta del proyecto: la usarás en la demostración de tolerancia a fallas.
7. Ten a la mano el diagrama `docs/diagramas/arquitectura.png`.

---

## 4. Guion de la presentación (unos 12 minutos)

### Parte 1: Qué es (1 minuto)
> "Cine Atlántico es una taquilla en línea para cines pequeños. El cliente compra sus boletos y elige su asiento desde el navegador, recibe sus boletos por correo con un código QR, y el cine administra su cartelera y ve sus ventas. El sistema garantiza que un asiento nunca se venda dos veces."

### Parte 2: Arquitectura (2 minutos)
Muestra el diagrama `docs/diagramas/arquitectura.png` y explica:

> "El sistema está dividido en tres microservicios:
> - **Boletos**: la página web, la API REST y la venta de asientos.
> - **Notificaciones**: envía los correos con los boletos.
> - **Reportes**: calcula las estadísticas de ventas.
>
> No se llaman directamente entre sí. Cuando hay una compra, el servicio de boletos publica un **evento** en **RabbitMQ**, y cada servicio interesado recibe su propia copia en su **cola**. Así, cada servicio puede fallar o reiniciarse sin afectar la venta de boletos."

### Parte 3: Demostración de compra (2 minutos)
En la **pestaña 1**:
1. Elige una película y un horario.
2. Escribe **4** y presiona **"Elegir mejores asientos"**: explica que el sistema busca asientos juntos, centrados y a buena distancia de la pantalla.
3. Escribe un nombre y un email cualquiera, y presiona **Comprar**.
4. Muestra los boletos con su código.

### Parte 4: Demostración de la mensajería (2 minutos)
1. **Pestaña 2 (Mailpit):** abre el correo que acaba de llegar.
   > "Este correo no lo envió el servicio de boletos: lo envió el **servicio de notificaciones**, que recibió el evento `compra.creada` por RabbitMQ. Cada boleto trae su código QR."
2. **Pestaña 3 (RabbitMQ):** muestra las colas `notificaciones` y `reportes`.
   > "Cada servicio tiene su cola. Ahora están en cero porque los servicios procesaron los mensajes al instante. Las colas `.fallidos` guardan los mensajes que fallan dos veces, para revisarlos en lugar de perderlos."
3. **Pestaña 1 → Administración** (clave `admin123`): baja hasta **Estadísticas en vivo**.
   > "Estas estadísticas las calcula el **servicio de reportes**, con su propia base de datos, a partir de los eventos que recibe."

### Parte 5: Demostración de tolerancia a fallas (2 minutos)
Esta es la demostración más convincente de por qué sirve la mensajería.

1. En la terminal, **apaga** el servicio de notificaciones:
   ```
   docker compose stop notificaciones
   ```
2. En la pestaña 1, **compra otro boleto**. La compra funciona normalmente.
   > "El servicio de correos está apagado, pero la venta no se detuvo."
3. En la pestaña 3 (RabbitMQ), espera unos 5 segundos: la cola `notificaciones` muestra **1** mensaje en **Ready** (en espera).
   > "El mensaje está esperando en la cola. No se perdió."
4. En la pestaña 2 (Mailpit), muestra que **todavía no llegó** el correo.
5. **Enciende** de nuevo el servicio:
   ```
   docker compose start notificaciones
   ```
6. En unos segundos el correo llega a Mailpit y la cola vuelve a **0**.
   > "En cuanto el servicio volvió, procesó el mensaje pendiente. Esto es lo que da la mensajería asíncrona: tolerancia a fallas."

### Parte 6: Cierre (1 a 2 minutos)
> "La reserva de asientos sigue siendo una operación indivisible en MongoDB, porque el cliente necesita saber al instante si consiguió su asiento. La mensajería la usamos para lo que pasa después: los correos y las estadísticas. Como mejoras futuras: pago real, cuentas de administrador y actualización del mapa en tiempo real."

---

## 5. Frases clave sobre la mensajería

- **Asíncrono:** el servicio de boletos publica el evento y responde al cliente sin esperar a que se envíe el correo.
- **Desacoplado:** el servicio de boletos no sabe quién escucha sus eventos; agregar un servicio nuevo no requiere cambiarlo.
- **Tolerante a fallas:** si un servicio se cae, sus mensajes esperan en la cola.
- **Cada microservicio tiene su propia base de datos:** el de reportes nunca lee la base del de boletos.

---

## 6. Preguntas probables sobre la mensajería

**¿Por qué RabbitMQ y no Kafka o IBM MQ?**
RabbitMQ es gratuito, de código abierto, se enciende con Docker en segundos y tiene un panel web para ver las colas. Kafka está pensado para volúmenes enormes de datos y su instalación es más pesada; IBM MQ es de pago. Para el tamaño de este sistema, RabbitMQ es la opción adecuada.

**¿Qué es un exchange, una cola y un binding?**
El **exchange** (`cine.eventos`) recibe los mensajes del publicador y decide a qué colas copiarlos. Una **cola** guarda los mensajes hasta que un servicio los procesa. Un **binding** es la regla que une una cola con el exchange: las colas `notificaciones` y `reportes` están unidas con la clave `compra.*`, así que ambas reciben `compra.creada` y `compra.cancelada`.

**¿Qué pasa si se cae RabbitMQ?**
La venta de boletos sigue funcionando. Usamos el **patrón outbox**: si el servicio de boletos no puede publicar un evento, lo guarda en MongoDB y lo reenvía en cuanto RabbitMQ vuelve. Además, los servicios se reconectan solos.

**¿Qué pasa si se cae el servicio de notificaciones?**
Los mensajes esperan en su cola, porque son persistentes y solo se borran cuando el servicio confirma que los procesó (*ack*). Al volver, el servicio envía todos los correos pendientes. Es justo lo que muestra la demostración de la parte 5.

**¿Qué pasa si un mensaje se procesa dos veces?**
RabbitMQ puede entregar un mensaje más de una vez, por ejemplo si un servicio se cae justo antes de confirmarlo. Por eso el servicio de reportes guarda cada evento con su **id único**: si llega repetido, lo ignora y no cuenta la venta dos veces. Eso se llama **idempotencia**.

**¿Qué pasa si un mensaje siempre falla?**
Se reintenta una vez. Si vuelve a fallar, pasa a la cola `<servicio>.fallidos` (*dead letter queue*) para revisarlo después, en lugar de bloquear la cola o perderse.

**¿Por qué la reserva de asientos no pasa por la cola?**
Porque el cliente necesita la respuesta al instante: si consiguió o no su asiento. Eso requiere una operación **síncrona** e indivisible en la base de datos. La mensajería es para los efectos secundarios, que pueden ocurrir unos segundos después.

**¿Qué es Mailpit? ¿Los correos son reales?**
Mailpit es un servidor de correo de prueba: recibe los correos y los muestra en una página web, sin enviarlos a internet. Así se puede demostrar el envío sin cuentas reales. Para producción, basta con configurar los datos de un servidor SMTP real.

**¿Cómo se comunican el panel de Administración y el servicio de reportes?**
Por HTTP: el servicio de boletos consulta `GET /estadisticas` del servicio de reportes. Si el servicio de reportes está apagado, el panel muestra un aviso y todo lo demás sigue funcionando.

---

## 7. Si algo falla durante la presentación

| Problema | Qué hacer |
|---|---|
| La página no abre | Revisa que Docker Desktop esté abierto y ejecuta `docker compose up -d`. Espera 15 segundos. |
| La cartelera está vacía | Genera funciones nuevas: `docker compose exec boletos node servicios/boletos/seed.js` |
| No llega el correo | Revisa que `notificaciones` esté encendido (`docker compose ps`); si no, `docker compose start notificaciones`. |
| La cola de RabbitMQ no muestra el mensaje en espera | El panel se actualiza cada 5 segundos: espera un momento o recarga la página. |
| "El servicio de reportes no está disponible" | `docker compose start reportes` |
| Nada funciona | `docker compose down` y luego `docker compose up -d`. Como último recurso, muestra las capturas de la carpeta `docs/`. |
