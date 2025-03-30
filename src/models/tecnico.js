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
        }
    }, {
        tableName: 'tecnicos',
        timestamps: true,
        underscored: true
    });

    // Hook para hashear la contraseña antes de guardar
    Tecnico.beforeCreate(async (tecnico) => {
        const salt = await bcrypt.genSalt(10);
        tecnico.contrasena = await bcrypt.hash(tecnico.contrasena, salt);
    });

    // Método para comparar contraseñas
    Tecnico.prototype.validarContrasena = async function(contrasena) {
        return bcrypt.compare(contrasena, this.contrasena);
    };

    return Tecnico;
};