const { Sequelize, DataTypes } = require('sequelize');

/*const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres', 
    logging: false
}); */

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Ajustar según el entorno
        }
    }
});


const Inyectora = require('./inyectora.js')(sequelize, DataTypes);
const Tecnico = require('./tecnico.js')(sequelize, DataTypes);

module.exports = { sequelize, Inyectora, Tecnico };

/*
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  logging: console.log, // Esto muestra los logs en la consola
});

*/