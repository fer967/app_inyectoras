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
const requireAuth = require('./middleware/auth.js');
const http = require("http");
const { initSocket } = require("./socket");
const server = http.createServer(app);
const mainRoutes = require('./routes/index'); 

app.engine('hbs', engine({
    defaultLayout: 'main',
    extname: '.hbs',
    helpers: helpers,
    runtimeOptions: {
        // permite acceso a propiedades en prototipos (quita la advertencia)
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: new SequelizeStore({
        db: sequelize,
        checkExpirationInterval: 15 * 60 * 1000, 
        expiration: 30 * 60 * 1000  
    },
    function(err) {
        if (err) {
            console.log('Error creating session table:', err);
        }
    }),
    cookie: {
        maxAge: 30 * 60 * 1000 
    }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/auth', authRoutes); 
app.use('/consultar', requireAuth, routes, mainRoutes); 
app.use('/', mainRoutes);                                 
app.get('/', (req, res) => {
    res.redirect('/inicio'); 
});
app.get('/inicio', (req, res) => {
    res.render('inicio'); 
});

initSocket(server);

sequelize.sync({ force: false }) 
    .then(() => {
        console.log('Base de datos sincronizada.');
        
        server.listen(port, () => {
            console.log(`server in http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('Error al sincronizar la base de datos:', err);
    });













