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
        //console.log('Técnico registrado:', tecnico.nombre);   OK
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

// Ruta para procesar el login
router.post('/login', async (req, res) => {
    const { nombre, contrasena } = req.body;
    try {
        // Busca al técnico por nombre
        const tecnico = await Tecnico.findOne({ where: { nombre } });
        // Verifica si el técnico existe y si la contraseña es correcta
        if (tecnico && await tecnico.validarContrasena(contrasena)) {
            // Inicia sesión (guarda el id del técnico en la sesión)
            req.session.tecnicoId = tecnico.id;
            console.log('Técnico autenticado:', tecnico.nombre);
            console.log('NUEVA SESION', req.session.tecnicoId);
            req.session.save(function (err) {
                if (err) {
                    console.log('Error al guardar la sesión:', err);
                    return res.status(500).send('Error al iniciar sesión');
                }
                console.log('Redirigiendo a /consultar...'); // RASTREO
                res.redirect('/consultar'); // Redirige a la vista de consulta
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



router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.redirect('/inicio');
    });
});

module.exports = router;




