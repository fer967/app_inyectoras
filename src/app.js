const express = require('express');
const { engine }  = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();
const routes = require('./routes');
const authRoutes = require('./routes/auth.js'); 
const session = require('express-session');
const SequelizeStore = require('connect-pg-simple')(session); 
const { sequelize } = require('./models/database.js');
const helpers = require('./helpers.js');

const app = express();
const port = process.env.PORT || 8000;

// Configuración de Handlebars
app.engine('hbs', engine({
    defaultLayout: 'main',
    extname: '.hbs',
    helpers: helpers
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuración de Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: new SequelizeStore({
        db: sequelize,
        checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds(15 minutes).
        expiration: 30 * 60 * 1000  // The maximum age of a valid session. (30 minutes).
    },
    function(err) {
        if (err) {
            console.log('Error creating session table:', err);
        }
    }),
    cookie: {
        maxAge: 30 * 60 * 1000 // 30 minutos de inactividad
    }
}));



// Middleware para verificar si el usuario está autenticado
const requireAuth = (req, res, next) => {
    console.log('requireAuth: req.session.tecnicoId =', req.session.tecnicoId); // RASTREO se agrega   OK
    if (req.session.tecnicoId) {
        next();
    } else {
        res.redirect('/auth/login'); 
    }
};

// Rutas
app.use('/auth', authRoutes); 
app.use('/consultar', requireAuth, routes); 
app.get('/', (req, res) => {
    res.redirect('/inicio'); 
});
app.get('/inicio', (req, res) => {
    res.render('inicio'); 
});

sequelize.sync({ force: false }) // `force: true` borra y recrea la base de datos (¡CUIDADO!)
    .then(() => {
        console.log('Base de datos sincronizada.');
        app.listen(port, () => {
            console.log(`server in http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('Error al sincronizar la base de datos:', err);
    });








