const express = require('express');
const router = express.Router();
const { Inyectora } = require('../models/database.js');
const { Op } = require("sequelize");
const apiKey = process.env.GEMINI_API_KEY;
const moment = require('moment');

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/ingresar-reparacion', (req, res) => {
    res.render('ingresar_reparacion');
});

router.post('/ingresar-reparacion', async (req, res) => {
    const { marca, modelo, falla, sistema, reparacion_realizada, operario_nombre, operario_apellido, fecha } = req.body;
    try {
        const nuevaReparacion = await Inyectora.create({
            marca,
            modelo,
            falla,
            sistema,
            reparacion_realizada,
            operario_nombre,
            operario_apellido,
            fecha
        });
        console.log('Reparación registrada:', nuevaReparacion.id);
        res.redirect('/consultar');
    } catch (error) {
        console.error('Error al registrar reparación:', error);
        res.status(500).send('Error al registrar reparación');
    }
});


function detectarSistema(texto) {
    if (!texto) return null;
    const t = texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const sistemas = {
        hidraulico: ["hidraulico", "hidraulica", "aceite", "presion"],
        electrico: ["electrico", "electrica", "cable", "sensor", "plc"],
        mecanico: ["mecanico", "rotura", "pieza", "engrane"],
        refrigeracion: ["refrigeracion", "enfriamiento", "chiller"],
        calefaccion: ["calefaccion", "calor", "resistencia"],
        inyeccion: ["inyeccion", "inyecta", "plastico", "material"]
    };
    for (let sistema in sistemas) {
        if (sistemas[sistema].some(p => t.includes(p))) {
            return sistema;
        }
    }
    return null;
}


function detectarMarca(texto) {
    const t = texto.toLowerCase();
    const marcas = [
        "haitai",
        "haida",
        "arburg",
        "engel",
        "haitian",
        "sumitomo",
        "krauss",
        "demag",
        "nissei"
    ];
    for (let m of marcas) {
        if (t.includes(m)) return m;
    }
    return null;
}


function detectarModelo(texto) {
    const t = texto.toUpperCase();
    const match = t.match(/\b(\d{2,3})[\s\-]*([A-Z])\b/);
    if (!match) return null;
    const numero = match[1];  
    const letra = match[2];   
    return `${numero} ${letra}`;  
}


async function generarConsultaSistemaModelo(texto) {
    const sistema = detectarSistema(texto);
    const modelo = detectarModelo(texto);
    const marca = detectarMarca(texto);
    console.log("🔍 Sistema detectado:", sistema);
    console.log("🔍 Modelo detectado:", modelo);
    console.log("🔍 Marca detectada:", marca);
    if (!sistema && !modelo && !marca) return null;
    const where = {};
    if (sistema) where.sistema = { [Op.iLike]: `%${sistema}%` };
    if (modelo) where.modelo = { [Op.iLike]: `%${modelo}%` };
    if (marca) where.marca = { [Op.iLike]: `%${marca}%` };
    return { where };
}


async function consultarGemini(pregunta) {
    try {
        const fetch = (await import('node-fetch')).default;
        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: pregunta }] }]
            })
        });
        if (!response.ok) {
            console.error("ERROR en consultarGemini: response.ok false");
            throw new Error(`Error Gemini: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al consultar Gemini:', error);
        return { error: 'Error al consultar Gemini API' };
    }
}


router.post('/', async (req, res) => {
    const pregunta = req.body.pregunta_bot || req.body.pregunta;
    try {
        const geminiResponse = await consultarGemini(pregunta);
        const intencion = analizarIntencion(geminiResponse);
        if (intencion === 'generar_dashboard') {
            return generarDashboard(req, res);
        }
        const consultaSequelize = await generarConsultaSQL(pregunta);
        if (!consultaSequelize) {
            console.log('No se pudo generar consulta SQL');
            return res.render('resultados', { resultados: null });
        }
        const resultados = await Inyectora.findAll(consultaSequelize);
        const plain = resultados.map(r => r.get({ plain: true }));
        res.render('resultados', { resultados: plain });
    } catch (error) {
        console.error('Error al procesar consulta:', error);
        res.status(500).send('Error al procesar la consulta');
    }
});


router.post('/mostrar-reparaciones', async (req, res) => {
    try {
        const resultados = await Inyectora.findAll();
        res.render('resultados', { resultados: resultados.map(r => r.get({ plain: true })) });
    } catch (error) {
        console.error('Error obtener reparaciones:', error);
        res.status(500).send('Error al obtener reparaciones');
    }
});


function quiereJSON(req) {
    return req.xhr || req.headers.accept?.includes("application/json");
}


router.post("/consultar-bot", async (req, res) => {
    const preguntaBD = req.body.pregunta_bd;
    const preguntaIA = req.body.pregunta_ia;
    if (preguntaIA) {
        console.log("🤖 Consulta IA:", preguntaIA);
        const respuestaIA = await consultarGemini(preguntaIA);
        return res.render("resultados_bot", {
            origen: "IA",
            respuestaIA
        });
    }
    if (preguntaBD) {
        console.log("🛠 Consulta BD:", preguntaBD);
        const consulta = await generarConsultaSistemaModelo(preguntaBD);
        if (!consulta) {
            return res.render("resultados_bot", {
                origen: "BD",
                resultados: [],
                mensaje: "Debe indicar al menos marca, modelo o sistema."
            });
        }
        const resultados = await Inyectora.findAll(consulta);
        if (resultados.length === 0) {
            return res.render("resultados_bot", {
                origen: "BD",
                resultados: [],
                mensaje: "No se encontraron fallas para ese sistema y modelo."
            });
        }
        return res.render("resultados_bot", {
            origen: "BD",
            resultados: resultados.map(r => r.get({ plain: true }))
        });
    }
    return res.render("resultados_bot", {
        origen: "ERROR",
        mensaje: "No se recibió ninguna consulta."
    });
});


function analizarIntencion(geminiResponse) {
    const texto = geminiResponse.candidates[0].content.parts[0].text.toLowerCase();
    return texto.includes('dashboard') ? 'generar_dashboard' : 'consultar_datos';
}

module.exports = router;

























