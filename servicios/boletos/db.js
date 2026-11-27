const mongoose = require('mongoose');

async function conectar(uri) {
  await mongoose.connect(uri);
  console.log(`MongoDB conectado: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = { conectar };
