require('dotenv').config();
const app = require('./app');
const { conectar } = require('./db');

const PORT = process.env.PORT || 3000;
const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cine';

conectar(URI)
  .then(() => app.listen(PORT, () => console.log(`Cine listo en http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('No se pudo conectar a MongoDB:', err.message);
    process.exit(1);
  });
