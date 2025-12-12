const express = require('express');
const router = express.Router();
const { Tecnico } = require('../models/database.js');
const session = require('express-session');

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async (req, res) => {
    const { nombre, apellido, edad, especialidad, contrasena } = req.body;
    try {
        const tecnico = await Tecnico.create({
            nombre,
            apellido,
            edad,
            especialidad,
            contrasena
        });
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Error al registrar técnico:', error);
        res.status(500).send('Error al registrar técnico');
    }
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', async (req, res) => {
    const { nombre, contrasena } = req.body;
    try {
        const tecnico = await Tecnico.findOne({ where: { nombre } });
        if (tecnico && await tecnico.validarContrasena(contrasena)) {
            req.session.tecnicoId = tecnico.id;
            // Guardar la sesión antes de redirigir
            await tecnico.update({ conectado: true });
            console.log('Técnico autenticado:', tecnico.nombre);
            console.log('NUEVA SESION', req.session.tecnicoId);
            req.session.save(function (err) {
                if (err) {
                    console.log('Error al guardar la sesión:', err);
                    return res.status(500).send('Error al iniciar sesión');
                }
                console.log('Redirigiendo a /consultar...'); 
                res.redirect('/consultar');
            });
        } else {
            console.log('Credenciales incorrectas. Contexto de la vista:', { error: 'Credenciales incorrectas' });
            res.render('login', { error: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).send('Error al iniciar sesión');
    }
});

router.get('/logout', async (req, res) => {
    try {
        const tecnicoId = req.session.tecnicoId;
        if (tecnicoId) {
            await Tecnico.update(
                { conectado: false },
                { where: { id: tecnicoId } }
            );
            console.log(`🔻 Técnico ${tecnicoId} desconectado (logout)`);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Error al cerrar sesión:', err);
            }
            res.redirect('/inicio');
        });
    } catch (error) {
        console.error("Error en logout:", error);
        res.redirect('/inicio');
    }
});

module.exports = router;




