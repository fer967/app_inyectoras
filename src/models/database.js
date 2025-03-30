const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres', 
    logging: false
});

const Inyectora = require('./inyectora.js')(sequelize, DataTypes);
const Tecnico = require('./tecnico.js')(sequelize, DataTypes);

module.exports = { sequelize, Inyectora, Tecnico };