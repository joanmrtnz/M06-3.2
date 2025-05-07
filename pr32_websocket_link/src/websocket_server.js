require('dotenv').config();
const path = require('path');
const { MongoClient } = require('mongodb');
const WebSocket = require('ws');
const { createLogger, format, transports } = require('winston');

/**
 * Winston logger configuration
 *  - Consola: colores y timestamps
 *  - Ficheros:
 *      • logs/combined.log – todos los niveles (info por defecto)
 *      • logs/error.log    – sólo errores
 *      • logs/exceptions.log & logs/rejections.log para capturar errores globales
 */
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack }) => {
            return `${timestamp} [${level.toUpperCase()}] ${stack || message}`;
        })
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize({ all: true })
            )
        }),
        new transports.File({ filename: path.join(__dirname, 'logs', 'combined.log') }),
        new transports.File({ filename: path.join(__dirname, 'logs', 'error.log'), level: 'error' })
    ],
    exceptionHandlers: [
        new transports.File({ filename: path.join(__dirname, 'logs', 'exceptions.log') })
    ],
    rejectionHandlers: [
        new transports.File({ filename: path.join(__dirname, 'logs', 'rejections.log') })
    ]
});

// Configuración de la aplicación ------------------------------------------------
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/';
const DATABASE_NAME = 'players_db';
const COLLECTION_NAME = 'players';

const wss = new WebSocket.Server({ port: PORT });
const playerTimers = new Map(); // Almacena los timers por jugador

logger.info(`Servidor WebSocket iniciado en el puerto ${PORT}`);

wss.on('connection', (ws) => {
    logger.info('Nuevo cliente conectado');
    ws.send('Bienvenido al servidor WebSocket');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'move' && data.player && typeof data.player.x === 'number' && typeof data.player.y === 'number') {
                logger.info(`Movimiento detectado: ID=${data.player.id}, x=${data.player.x}, y=${data.player.y}`);

                const playerData = {
                    player_id: data.player.id,
                    game: data.player.game,
                    x: data.player.x,
                    y: data.player.y
                };

                await savePlayerToMongoDB(playerData);
                resetPlayerTimer(data.player.id, ws);

                // === Difusión de las posiciones a otros clientes si es necesario ===
                /*
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'update',
                            player: playerData
                        }));
                    }
                });
                */
            } else {
                logger.warn(`Mensaje recibido pero no válido: ${JSON.stringify(data)}`);
            }
        } catch (error) {
            logger.error(`Error: el mensaje no es un JSON válido -> ${message.toString()}`, error);
        }
    });

    ws.on('close', () => {
        logger.info('Cliente desconectado');
        for (const [playerId, timer] of playerTimers.entries()) {
            clearTimeout(timer);
            playerTimers.delete(playerId);
        }
    });
});

// --------------------------- Funciones auxiliares -----------------------------
async function savePlayerToMongoDB(player) {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const collection = client.db(DATABASE_NAME).collection(COLLECTION_NAME);
        await collection.insertOne(player);
        logger.info(`Jugador ${player.player_id} en game ${player.game} guardado en la base de datos.`);
    } catch (error) {
        logger.error('Error guardando datos en MongoDB:', error);
    } finally {
        await client.close();
        logger.debug('Conexión a MongoDB cerrada.');
    }
}

function resetPlayerTimer(playerId, ws) {
    if (playerTimers.has(playerId)) {
        clearTimeout(playerTimers.get(playerId));
    }

    const timer = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'lost', message: 'Has perdido por inactividad.' }));
        }
        logger.info(`Jugador ${playerId} ha perdido por inactividad.`);
    }, 10000);

    playerTimers.set(playerId, timer);
}

// --------------------------- Graceful shutdown -----------------------------
process.on('SIGINT', () => {
    logger.info('Apagando servidor...');
    wss.close(() => {
        logger.info('Servidor WebSocket parado.');
        process.exit(0);
    });
});
