module.exports = function requireAuth(req, res, next) {
    const logged = req.session && req.session.tecnicoId;
    if (!logged) {
        // Si viene desde fetch → devolver JSON, NO HTML
        const aceptaJson = req.headers.accept && req.headers.accept.includes("application/json");
        if (aceptaJson) {
            return res.status(401).json({ error: "No autenticado" });
        }
        return res.redirect("/auth/login");
    }
    next();
};



