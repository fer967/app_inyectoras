const { Tecnico } = require("./models/database");

let io;

function initSocket(server) {
    io = require("socket.io")(server, { cors: { origin: "*" } });
    io.on("connection", (socket) => {
        console.log("🟢 Cliente conectado:", socket.id);
        // Técnico se registra
        socket.on("registrar_tecnico", async (tecnicoId) => {
            socket.tecnicoId = tecnicoId;
            await Tecnico.update(
                { conectado: true },
                { where: { id: tecnicoId } }
            );
            const tecnico = await Tecnico.findByPk(tecnicoId);
            // Notificar a todos los clientes
            io.emit("tecnico_estado", {
                id: tecnico.id,
                nombre: tecnico.nombre,
                apellido: tecnico.apellido,
                conectado: true
            });
            console.log(`🟩 Técnico ${tecnicoId} conectado`);
        });
        // Desconexión
        socket.on("disconnect", async () => {
    console.log("🔴 Cliente desconectado:", socket.id);
    if (!socket.tecnicoId) return; // No era técnico, ignorar
    const tecnicoId = socket.tecnicoId;
    // Esperamos un momento para ver si el navegador abre otro socket
    setTimeout(async () => {
        const sockets = await io.fetchSockets();
        // VERIFICAR si existe OTRO socket del mismo técnico
        const sigueOnline = sockets.some(s => s.tecnicoId === tecnicoId);
        if (sigueOnline) {
            console.log(`🟡 Técnico ${tecnicoId} sigue conectado por otro socket`);
            return;
        }
        // Si no hay ningún socket de ese técnico → realmente desconectado
        await Tecnico.update(
            { conectado: false },
            { where: { id: tecnicoId } }
        );
        const tecnico = await Tecnico.findByPk(tecnicoId);
        io.emit("tecnico_estado", {
            id: tecnico.id,
            nombre: tecnico.nombre,
            apellido: tecnico.apellido,
            conectado: false
        });
        console.log(`🔻 Técnico ${tecnicoId} marcado como desconectado`);
    }, 3000); 
});
        return io;
    });
}

module.exports = { initSocket };












