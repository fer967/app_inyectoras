const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: false,  timezone: '-03:00'  });
const Inyectora = require('./inyectora.js')(sequelize, DataTypes); 
const Tecnico = require('./tecnico.js')(sequelize, DataTypes);
const HistorialChat = require("./HistorialChat.js")(sequelize, DataTypes);
const Tarea = require("./tarea.js")(sequelize, DataTypes);
Tarea.belongsTo(Tecnico, { foreignKey: "tecnico_id", as: "tecnico" });
Tecnico.hasMany(Tarea, { foreignKey: "tecnico_id" });

module.exports = { sequelize, Inyectora, Tecnico, HistorialChat, Tarea };



