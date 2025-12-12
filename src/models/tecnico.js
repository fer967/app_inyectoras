const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    const Tecnico = sequelize.define('Tecnico', {
        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },
        apellido: {
            type: DataTypes.STRING,
            allowNull: false
        },
        edad: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        especialidad: {
            type: DataTypes.STRING,
            allowNull: false
        },
        contrasena: {
            type: DataTypes.STRING,
            allowNull: false
        },
        conectado: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        disponible: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'tecnicos',
        timestamps: true,
        underscored: true
    });

    Tecnico.beforeCreate(async (tecnico) => {
        const salt = await bcrypt.genSalt(10);
        tecnico.contrasena = await bcrypt.hash(tecnico.contrasena, salt);
    });

    Tecnico.prototype.validarContrasena = async function (contrasena) {
        return bcrypt.compare(contrasena, this.contrasena);
    };
    return Tecnico;
};