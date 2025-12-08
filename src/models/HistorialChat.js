module.exports = (sequelize, DataTypes) => {
    const HistorialChat = sequelize.define("HistorialChat", {
        tecnico_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        mensaje_usuario: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        respuesta_bot: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        origen: {
            type: DataTypes.STRING,  // "IA" o "BD"
            allowNull: false
        }
    },
    {
        tableName: "historial_chat",
        timestamps: true,
        underscored: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    });
    return HistorialChat;
};





