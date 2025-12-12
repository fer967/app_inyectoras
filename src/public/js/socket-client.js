// Evita múltiples sockets en la misma pestaña
if (!window._socket) {
    const socket = io({ autoConnect: true });
    window._socket = socket;
    socket.on("connect", () => {
        console.log("🟢 Socket conectado:", socket.id);
        // Re-registrar técnico si ya estaba logueado
        fetch('/api/tecnico-logueado')
            .then(r => r.json())
            .then(data => {
                if (data.tecnicoId) {
                    socket.emit("registrar_tecnico", data.tecnicoId);
                }
            });
    });
    socket.on("disconnect", () => {
        console.log("🔴 Socket desconectado");
    });
}




