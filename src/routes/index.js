const express = require('express');
const router = express.Router();
const { Inyectora } = require('../models/database.js');
const { Op } = require("sequelize");
const apiKey = process.env.GEMINI_API_KEY;
const fs = require('fs');
const path = require('path');
const fallasData = require('../fallas.json');
const moment = require('moment');


router.get('/', (req, res) => {
    res.render('index');
});


router.get('/ingresar-reparacion', (req, res) => {
    res.render('ingresar_reparacion');
});


router.post('/ingresar-reparacion', async (req, res) => {
    const { marca, modelo, falla, reparacion_realizada, operario_nombre, operario_apellido, fecha } = req.body;
    console.log('Datos recibidos en el formulario de ingreso de reparacion:', req.body);
    try {
        const nuevaReparacion = await Inyectora.create({
            marca: marca,
            modelo: modelo,
            falla: falla,
            reparacion_realizada: reparacion_realizada,
            operario_nombre: operario_nombre,
            operario_apellido: operario_apellido,
            fecha: fecha
        });
        console.log('Reparación registrada:', nuevaReparacion.id);
        res.redirect('/consultar');
    } catch (error) {
        console.error('Error al registrar reparación:', error);
        res.status(500).send('Error al registrar reparación');
    }
});


async function generarConsultaSQL(pregunta) {
    try {
        // 1. Buscar la falla en el archivo fallas.json
        const fallaEncontrada = buscarFallaEnJSON(pregunta);
        if (fallaEncontrada) {
            //console.log('Falla encontrada en el archivo JSON:', fallaEncontrada);
            // **CONSTRUIR LA CONSULTA SEQUELIZE BASÁNDOSE EN LA INFORMACIÓN DE LA FALLA**
            const whereClause = {
                falla: fallaEncontrada.falla
            };
            // **AGREGAR FILTROS ADICIONALES SI ES NECESARIO (POR EJEMPLO, MARCA, MODELO)**
            if (pregunta.includes("Arburg") && pregunta.includes("270 S")) {
                whereClause.marca = 'Arburg';
                whereClause.modelo = '270 S';
            }
            const consultaSequelize = { where: whereClause };
            //console.log('Consulta Sequelize generada a partir del archivo JSON:', consultaSequelize);
            return consultaSequelize;
        }
        // 2. Si no se encuentra la falla en el archivo JSON, generar la consulta Sequelize
        // (Código existente para generar la consulta Sequelize)
        const geminiResponse = { candidates: [{ content: { parts: [{ text: pregunta }] } }] };
        if (!geminiResponse || typeof geminiResponse !== 'object') {
            console.error('La respuesta de Gemini es nula o no es un objeto:', geminiResponse);
            return null;
        }
        if (!geminiResponse.candidates || !Array.isArray(geminiResponse.candidates)) {
            console.error('La respuesta de Gemini no contiene la propiedad candidates o no es un array:', geminiResponse);
            return null;
        }
        if (geminiResponse.candidates.length === 0) {
            console.error('El array candidates está vacío:', geminiResponse);
            return null;
        }
        const respuesta = geminiResponse.candidates[0].content.parts[0].text;
        let marca = null;
        let modelo = null;
        let fechaInicio = null;
        let fechaFin = null;
        let operarioNombre = null;
        let operarioApellido = null;
        if (pregunta.includes("Arburg") && pregunta.includes("270 S")) {
            marca = 'Arburg';
            modelo = '270 S';
        }
        if (pregunta.includes("semana pasada")) {
            fechaInicio = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            fechaFin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        }
        if (pregunta.includes("Juan") && pregunta.includes("Perez")) {
            operarioNombre = 'Juan';
            operarioApellido = 'Perez';
        }
        const whereClause = {};
        if (marca) {
            whereClause.marca = marca;
        }
        if (modelo) {
            whereClause.modelo = modelo;
        }
        if (fechaInicio && fechaFin) {
            whereClause.fecha = {
                [Op.between]: [fechaInicio, fechaFin]
            };
        }
        if (operarioNombre && operarioApellido) {
            whereClause.operario_nombre = operarioNombre;
            whereClause.operario_apellido = operarioApellido;
        }
        const consultaSequelize = { where: whereClause };
        console.log('Consulta Sequelize generada a partir del análisis de la pregunta:', consultaSequelize);
        return consultaSequelize;
    } catch (error) {
        console.error('Error al generar la consulta Sequelize:', error);
        return null;
    }
}

function buscarFallaEnJSON(pregunta) {
    const stopWords = ["en", "de", "la", "el", "y", "a", "con", "para", "por"]; // Lista de palabras clave comunes
    const preguntaLower = pregunta.toLowerCase();
    const preguntaPalabras = preguntaLower.split(/[\s\W]+/).filter(Boolean).filter(palabra => !stopWords.includes(palabra)); // Divide la pregunta en palabras y elimina las palabras clave comunes
    for (const falla of fallasData) {
        const fallaLower = falla.falla.toLowerCase();
        const fallaPalabras = fallaLower.split(/[\s\W]+/).filter(Boolean).filter(palabra => !stopWords.includes(palabra)); // Divide la descripción de la falla en palabras y elimina las palabras clave comunes
        let coincidencias = 0;
        fallaPalabras.forEach(palabra => {
            if (preguntaPalabras.includes(palabra)) {
                coincidencias++;
            }
        });
        // Verificar si hay una cantidad mínima de coincidencias
        if (fallaPalabras.length > 0) {
            const porcentajeCoincidencia = coincidencias / fallaPalabras.length;
            if (porcentajeCoincidencia >= 0.5) { // 50% de coincidencia
                //console.log('Falla encontrada:', falla.falla); // RASTREO
                return falla; // Retorna el objeto de la falla si se encuentra
            }
        }
    }
    return null; // No se encontró la falla en el archivo JSON local
}

async function consultarGemini(pregunta) {
    try {
        // 1. Buscar la falla en el archivo JSON local
        const fallaEncontrada = buscarFallaEnJSON(pregunta);
        if (fallaEncontrada) {
            console.log('Respuesta encontrada en el archivo JSON local.');
            //Formateo
            const respuestaFormateada = `Posibles causas: ${fallaEncontrada.causas_posibles.join(", ")}. Soluciones: ${fallaEncontrada.soluciones.join(", ")}. Sistema: ${fallaEncontrada.sistema}. Máquinas aplicables: ${fallaEncontrada.maquinas_aplicables.join(", ")}.`;
            return { candidates: [{ content: { parts: [{ text: respuestaFormateada }] } }] }; // Formatea la respuesta para que coincida con la API de Gemini
        }
        // 2. Si no se encuentra la respuesta en el archivo JSON local, consultar la API de Gemini
        const fetch = (await import('node-fetch')).default; // Importación dinámica de node-fetch
        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: pregunta }]
                }]
            })
        });
        if (!response.ok) {
            console.error(" ERROR en consultarGemini: response.ok es false"); // RASTREO
            throw new Error(`Error al consultar la API de Gemini: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        return data; // Devuelve la respuesta completa de Gemini
    } catch (error) {
        console.error('Error al consultar la API de Gemini:', error);
        console.log("*** consultarGemini RETORNANDO objeto de error:", { error: 'Error al consultar Gemini API' }); // RASTREO
        return { error: 'Error al consultar Gemini API' }; // Devuelve un objeto con un error
    }
}


function procesarEstadisticas(resultados) {
    const fallasPorMarca = {};
    resultados.forEach(resultado => {
        console.log('procesando resultado:', JSON.stringify(resultado));
        if (fallasPorMarca[resultado.marca]) {
            fallasPorMarca[resultado.marca]++;
        } else {
            fallasPorMarca[resultado.marca] = 1;
        }
    });
    return {
        fallasPorMarca: fallasPorMarca
    };
}


async function generarDashboard(req, res) {
    try {
        // 1. Obtener los datos de fallas de la última semana
        //const fechaInicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        //const fechaFin = new Date();
        const fechaInicio = moment('2025-03-11', 'YYYY-MM-DD').format('YYYY-MM-DD HH:mm:ss');
        const fechaFin = moment('2025-03-14', 'YYYY-MM-DD').format('YYYY-MM-DD HH:mm:ss');
        console.log('Fecha de inicio:', fechaInicio);
        console.log('Fecha de fin:', fechaFin);
        const resultados = await Inyectora.findAll({
            where: {
                fecha: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            }
        });
        console.log('Verificando consulta a la Base de Datos: ', JSON.stringify(resultados));
        // **CONVERTIR LOS OBJETOS A OBJETOS SIMPLES**
        const resultadosPlain = resultados.map(resultado => resultado.get({ plain: true }));
        // 2. Procesar los datos para obtener las estadísticas necesarias
        //console.log('Resultados para procesarEstadisticas:', JSON.stringify(resultadosPlain));
        const estadisticas = procesarEstadisticas(resultadosPlain); // Implementar la función procesarEstadisticas
        // **3. Enviar los datos al frontend para que se genere el gráfico con ApexCharts**
        console.log('Estadísticas para el dashboard:', JSON.stringify(estadisticas));  // ver si hay datos
        res.render('dashboard', { estadisticas: JSON.stringify(estadisticas) }); // Enviar las estadísticas como JSON
    } catch (error) {
        console.error('Error al generar el dashboard:', error);
        res.status(500).send('Error al generar el dashboard');
    }
}

router.post('/', async (req, res) => {
    const pregunta = req.body.pregunta;
    console.log('Pregunta recibida:', pregunta);
    try {
        // 1. Consultar Gemini
        const geminiResponse = await consultarGemini(pregunta);
        // **ANALIZAR LA RESPUESTA DE GEMINI PARA DETERMINAR LA INTENCIÓN**
        const intencion = analizarIntencion(geminiResponse);
        if (intencion === 'generar_dashboard') {
            generarDashboard(req, res);
        } else {
            // 2. Generar la consulta Sequelize
            const consultaSequelize = await generarConsultaSQL(pregunta, geminiResponse);
            if (consultaSequelize) {
                console.log('Consulta Sequelize generada:', consultaSequelize);
                // 3. Ejecutar la consulta con Sequelize
                const resultados = await Inyectora.findAll(consultaSequelize);
                // CONVERTIR LOS OBJETOS A OBJETOS SIMPLES
                const resultadosPlain = resultados.map(resultado => resultado.get({ plain: true }));
                // Renderizar la vista de resultados (la tabla)
                res.render('resultados', { resultados: resultadosPlain });
                // Renderizar la vista de la respuesta del bot (geminiResponse)
                res.render('respuesta_bot', { geminiResponse: geminiResponse.candidates[0].content.parts[0].text });
            } else {
                console.log('No se pudo generar una consulta para la pregunta:', pregunta);
                res.render('resultados', { resultados: null });
                res.render('respuesta_bot', { geminiResponse: "No se pudo procesar la pregunta." });
            }
        }
    } catch (error) {
        console.error('Error al procesar la consulta:', error);
        res.status(500).send('Error al procesar la consulta');
    }
});


router.post('/mostrar-reparaciones', async (req, res) => {
    try {
        // Consulta para obtener todos los registros de la tabla inyectoras
        const resultados = await Inyectora.findAll();
        // CONVERTIR LOS OBJETOS A OBJETOS SIMPLES
        const resultadosPlain = resultados.map(resultado => resultado.get({ plain: true }));
        // Renderizar la vista de resultados (la tabla)
        res.render('resultados', { resultados: resultadosPlain });
    } catch (error) {
        console.error('Error al obtener todas las reparaciones:', error);
        res.status(500).send('Error al obtener todas las reparaciones');
    }
});

router.post('/consultar-bot', async (req, res) => {
    const pregunta = req.body.pregunta_bot;
    //console.log('Pregunta al Bot recibida:', pregunta);
    try {
        // 1. Consultar Gemini (primero busca en fallas.json)
        const geminiResponse = await consultarGemini(pregunta);
        // Verificar si geminiResponse tiene contenido
        if (geminiResponse && geminiResponse.candidates && geminiResponse.candidates[0] && geminiResponse.candidates[0].content && geminiResponse.candidates[0].content.parts && geminiResponse.candidates[0].content.parts[0] && geminiResponse.candidates[0].content.parts[0].text) {
            res.render('respuesta_bot', { geminiResponse: geminiResponse.candidates[0].content.parts[0].text }); // vista respuesta_bot
        } else {
            res.render('respuesta_bot', { geminiResponse: "No se pudo obtener una respuesta." });
        }
    } catch (error) {
        console.error('Error al consultar Gemini:', error);
        res.status(500).send('Error al consultar Gemini');
    }
});




function analizarIntencion(geminiResponse) {
    const textoRespuesta = geminiResponse.candidates[0].content.parts[0].text;
    if (textoRespuesta.toLowerCase().includes('dashboard')) {
        return 'generar_dashboard';
    } else {
        return 'consultar_datos';
    }
}

module.exports = router;

















