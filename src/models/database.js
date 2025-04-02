const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: false });

const Inyectora = require('./inyectora.js')(sequelize, DataTypes); 
const Tecnico = require('./tecnico.js')(sequelize, DataTypes);

module.exports = { sequelize, Inyectora, Tecnico };



// para reeplazar a DATABASE_URL
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