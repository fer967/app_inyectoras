module.exports = (sequelize, DataTypes) => {
    const Tarea = sequelize.define("Tarea", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        titulo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        estado: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "pendiente"
        },
        prioridad: {
            type: DataTypes.STRING,
            defaultValue: "media"
        },
        especialidad_requerida: {
            type: DataTypes.STRING,
            allowNull: true
        },
        tecnico_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "tecnicos",
                key: "id"
            }
        },
        fecha_limite: {
            type: DataTypes.DATE,
            allowNull: true
        },
        hora_inicio: {
            type: DataTypes.DATE,
            allowNull: true
        },
        hora_fin: {
            type: DataTypes.DATE,
            allowNull: true
        },
        horas_totales: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
    }, {
        tableName: "tareas",
        timestamps: false
    });
    return Tarea;
};








