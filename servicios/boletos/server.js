require('dotenv').config();
const app = require('./app');
const { conectar } = require('./db');
const mensajeria = require('./mensajeria');
const Pelicula = require('./models/Pelicula');
const { seed } = require('./seed');

const PORT = process.env.PORT || 3000;
const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cine';

async function iniciar() {
  await conectar(URI);
  // Primera vez (base de datos vacía): se cargan las películas de ejemplo
  if ((await Pelicula.estimatedDocumentCount()) === 0) {
    console.log('[boletos] La base de datos está vacía: cargando datos de ejemplo');
    await seed();
  }
  mensajeria.iniciar(process.env.RABBITMQ_URL);
  app.listen(PORT, () => console.log(`[boletos] Cine listo en http://localhost:${PORT}`));
}

iniciar().catch((err) => {
  console.error('[boletos] No se pudo iniciar:', err.message);
  process.exit(1);
});
