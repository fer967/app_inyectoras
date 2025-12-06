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
        sistema: {
            type: DataTypes.TEXT,
            allowNull: false,
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
        tableName: 'inyectoras', 
        timestamps: false, 
        underscored: true 
    });
    return Inyectora;
};