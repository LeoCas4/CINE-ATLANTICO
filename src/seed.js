// Carga datos de ejemplo: 3 salas, 6 películas y funciones para los próximos 3 días.
require('dotenv').config();
const mongoose = require('mongoose');
const Pelicula = require('./models/Pelicula');
const Sala = require('./models/Sala');
const Funcion = require('./models/Funcion');
const Compra = require('./models/Compra');

async function seed() {
  await Promise.all([Pelicula.deleteMany(), Sala.deleteMany(), Funcion.deleteMany(), Compra.deleteMany()]);

  const salas = await Sala.create([
    { nombre: 'Sala 1', filas: 8, asientosPorFila: 14, pasillos: [3, 11], asientosDeshabilitados: ['A1', 'A14'], filasVip: ['H'], recargoVip: 40 },
    { nombre: 'Sala 2', filas: 10, asientosPorFila: 16, pasillos: [4, 12], filasVip: ['I', 'J'], recargoVip: 50 },
    { nombre: 'Sala 3 IMAX', filas: 12, asientosPorFila: 20, pasillos: [5, 15], asientosDeshabilitados: ['A1', 'A2', 'A19', 'A20'] },
  ]);

  const peliculas = await Pelicula.create([
    { titulo: 'Star Wars', posterUrl: '/posters/star-wars.jpg', genero: 'Ciencia ficción', clasificacion: 'A', duracionMin: 121, sinopsis: 'Luke Skywalker se une a un caballero Jedi, un piloto rebelde y dos droides para rescatar a la princesa Leia y enfrentar al Imperio.' },
    { titulo: 'Jurassic Park', posterUrl: '/posters/jurassic-park.jpg', genero: 'Aventura', clasificacion: 'B', duracionMin: 127, sinopsis: 'Un parque temático con dinosaurios clonados se sale de control cuando falla la seguridad de la isla.' },
    { titulo: 'Harry Potter', posterUrl: '/posters/harry-potter.jpg', genero: 'Fantasía', clasificacion: 'A', duracionMin: 152, sinopsis: 'Un niño descubre que es mago y comienza su primer año en el Colegio Hogwarts de Magia y Hechicería.' },
    { titulo: 'Minions', posterUrl: '/posters/minions.jpg', genero: 'Animación', clasificacion: 'AA', duracionMin: 91, sinopsis: 'Kevin, Stuart y Bob emprenden un viaje para encontrar al villano más malvado del mundo y servirle.' },
    { titulo: 'Parasite', posterUrl: '/posters/parasite.jpg', genero: 'Drama / Suspenso', clasificacion: 'B15', duracionMin: 132, sinopsis: 'Una familia pobre se infiltra poco a poco en la vida de una familia adinerada, con consecuencias inesperadas.' },
    { titulo: 'Obsesión', posterUrl: '/posters/obsesion.jpg', genero: 'Suspenso', clasificacion: 'B15', duracionMin: 105, sinopsis: 'Un deseo que se cumple se convierte en una obsesión peligrosa que nadie puede detener.' },
  ]);
  const [starWars, jurassic, harryPotter, minions, parasite, obsesion] = peliculas;

  // [película, sala, horas de inicio (17.5 = 17:30), formato, precio]
  // Los horarios están pensados para que no se encimen funciones en la misma sala.
  const horarios = [
    [minions, salas[0], [11, 13], '2D', 65],
    [obsesion, salas[0], [15, 17.5, 20, 22.25], '2D', 75],
    [parasite, salas[1], [12, 14.5, 17], '2D', 75],
    [harryPotter, salas[1], [19.5], '2D', 80],
    [starWars, salas[2], [12, 14.5], 'IMAX', 120],
    [jurassic, salas[2], [17, 19.5, 22], 'IMAX', 120],
  ];

  const funciones = [];
  for (let d = 0; d < 3; d++) {
    for (const [pelicula, sala, horas, formato, precio] of horarios) {
      for (const h of horas) {
        const inicio = new Date();
        inicio.setDate(inicio.getDate() + d);
        inicio.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
        if (inicio <= new Date()) continue;
        funciones.push({
          pelicula: pelicula._id,
          sala: sala._id,
          inicio,
          fin: new Date(inicio.getTime() + pelicula.duracionMin * 60000),
          precio,
          formato,
          idioma: h >= 21 ? 'Subtitulada' : 'Español',
        });
      }
    }
  }
  await Funcion.insertMany(funciones);
  console.log(`Datos cargados: ${salas.length} salas, ${peliculas.length} películas, ${funciones.length} funciones`);
}

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cine')
    .then(seed)
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed };
