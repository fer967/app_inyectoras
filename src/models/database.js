const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: false });

const Inyectora = require('./inyectora.js')(sequelize, DataTypes); 
const Tecnico = require('./tecnico.js')(sequelize, DataTypes);

module.exports = { sequelize, Inyectora, Tecnico };



// para reeplazar a DATABASE_URL     ¡¡¡¡ VER NO ANDA !!!!
/*
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  logging: false
});

DB_NAME=inyectoras_db
DB_USER=postgres
DB_PASSWORD=1986
DB_HOST=localhost
*/


// copia de seguridad 
/*
pg_dump -U usuario_local -h localhost -F c -b -v -f "archivo.dump" nombre_base_de_datos
*/


// configurar en supabase
/*
const { Sequelize } = require('sequelize');

// Reemplaza estos valores con tus credenciales de Supabase
const sequelize = new Sequelize({
  host: 'db.supabase.co',
  port: 5432,  // Puerto de PostgreSQL (por defecto)
  username: 'usuario_supabase',
  password: 'contraseña_supabase',
  database: 'nombre_base_de_datos',
  dialect: 'postgres',
  logging: false, // Si quieres ver las consultas en consola, pon esto como 'true'
});

// Verificar la conexión
sequelize.authenticate()
  .then(() => {
    console.log('Conexión a la base de datos establecida con éxito.');
  })
  .catch(err => {
    console.error('Error al conectar a la base de datos:', err);
  });
*/


// DATABASE_URL=postgresql://postgres:1986@localhost:5432/inyectoras_db
  