module.exports = (sequelize, DataTypes) => {
    const Inyectora = sequelize.define('Inyectora', {
        marca: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        modelo: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        falla: {
            type: DataTypes.TEXT,
        },
        reparacion_realizada: {
            type: DataTypes.TEXT,
        },
        operario_nombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        operario_apellido: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        fecha: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    }, {
        tableName: 'inyectoras', // Especifica el nombre de la tabla
        timestamps: false, // true Agrega createdAt y updatedAt
        underscored: true // Usa nombres con guiones bajos
    });
    return Inyectora;
};