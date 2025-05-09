require('dotenv').config();
const path = require('path');
const fs = require('fs');                 // <-- NEW: para asegurar la carpeta logs
const { MongoClient } = require('mongodb');
const WebSocket = require('ws');
const { createLogger, format, transports } = require('winston');

/**
 * Winston logger configuration
 *  - Consola: colores y timestamps
 *  - Ficheros:
 *      • logs/combined.log – todos los niveles (info por defecto)
 *      • logs/error.log    – sólo errores
 *      • logs/exceptions.log & logs/rejections.log para capturar errores globales
 */

// 01 Logging en dos fitxers i consola y 03 error handling
const LOG_DIR = path.join(__dirname, 'logs');          // <-- NEW
fs.mkdirSync(LOG_DIR, { recursive: true });            // <-- NEW: crea carpeta si falta

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
        new transports.File({ filename: path.join(LOG_DIR, 'combined.log') }),  // <-- ajusta ruta
        new transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error' })
    ],
    exceptionHandlers: [
        new transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') })
    ],
    rejectionHandlers: [
        new transports.File({ filename: path.join(LOG_DIR, 'rejections.log') })
    ]
});

// 1 port configurable

// 02 mantenibilitat, .env
const PORT = process.env.PORT || 8000;
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS) || 10000;   // <-- NEW: timeout configurable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/';
const DATABASE_NAME = 'players_db';
const COLLECTION_NAME = 'players';

const wss = new WebSocket.Server({ port: PORT });
const playerTimers = new Map();  // Almacena temporizadores
const playerStartPos = new Map();  // <-- NEW: posición inicial por jugador
const playerLastPos = new Map();  // <-- NEW: última posición por jugador

logger.info(`Servidor WebSocket iniciado en el puerto ${PORT}`);
// 2 conectar-se per ws
wss.on('connection', (ws) => {
    logger.info('Nuevo cliente conectado');
    const mensaje = {
        type: "welcome",
        message: "Bienvenido al servidor WebSocket"
    };
    ws.send(JSON.stringify(mensaje));

    ws.on('message', async (message) => {
        // 03 Maneig d’errors sense aturar el servidor
        try {
            // 5 valida i registra el moviment
            // Determinar si viene anidado o plano
            const data = JSON.parse(message.toString());

            // ───── VALIDACIÓN y normalización ──────────────────────
            let player = null;

            if (data.type === 'move' && data.player) {
                // formato recomendado
                player = data.player;
            } else if (data.playerId && data.gameId) {
                // formato plano antiguo
                player = {
                    id: data.playerId,
                    game: data.gameId,
                    x: data.x,
                    y: data.y
                };
            }

            // comprueba tipos (acepta game string o número)
            if (player &&
                typeof player.id === 'string' &&
                (typeof player.game === 'string' || typeof player.game === 'number') &&
                typeof player.x === 'number' &&
                typeof player.y === 'number') {

                // ------------- ya ES válido ----------------
                const timestampISO = new Date().toISOString();

                // guarda primera y última posición
                if (!playerStartPos.has(player.id)) {
                    playerStartPos.set(player.id, { x0: player.x, y0: player.y });
                }
                playerLastPos.set(player.id, { xn: player.x, yn: player.y });

                const playerData = {
                    player_id: player.id,
                    game: player.game,
                    x: player.x,
                    y: player.y,
                    timestamp: timestampISO
                };

                await savePlayerToMongoDB(playerData);
                resetPlayerTimer(player.id, player.game, ws);

            } else {
                // cualquier otro caso se considera inválido
                logger.warn(`Mensaje recibido pero no válido: ${JSON.stringify(data)}`);
            }

        } catch (error) {
            logger.info(error);

            //logger.error(`Error: el mensaje no es un JSON válido -> ${message.toString()}`, error);
        }
    });

    ws.on('close', () => {
        logger.info('Cliente desconectado');
        for (const [playerId, timer] of playerTimers.entries()) {
            clearTimeout(timer);
            playerTimers.delete(playerId);
            playerStartPos.delete(playerId);
            playerLastPos.delete(playerId);
        }
    });
});

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

function resetPlayerTimer(playerId, gameId, ws) {
    if (playerTimers.has(playerId)) {
        clearTimeout(playerTimers.get(playerId));
    }

    const timer = setTimeout(async () => {
        //9 fCalcular la distància i informar al client
        const start = playerStartPos.get(playerId);
        const last = playerLastPos.get(playerId);

        let distance = null;
        if (start && last) {
            distance = Math.hypot(last.xn - start.x0, last.yn - start.y0);
        }
        // 9 Enviar distancia al client
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'lost',
                distance: distance,
                message: `Has estado ${TIMEOUT_MS / 1000} segundos inactivo`
            }));
        }
        logger.info(`Jugador ${playerId} ha estado demasiado inactivo. Distancia=${distance !== null ? distance.toFixed(2) : 'N/A'}`);

        // 10 Guardar la distancia / timestamp si cal
        if (distance !== null) {
            const finalDoc = {
                player_id: playerId,
                game: gameId,
                distance: distance,
                lostAt: new Date().toISOString()
            };
            await savePlayerToMongoDB(finalDoc);
        }

        // Limpieza de mapas y timer
        clearTimeout(timer);
        playerTimers.delete(playerId);
        playerStartPos.delete(playerId);
        playerLastPos.delete(playerId);

    }, TIMEOUT_MS);

    playerTimers.set(playerId, timer);
}

process.on('SIGINT', () => {
    logger.info('Apagando servidor...');
    wss.close(() => {
        logger.info('Servidor WebSocket parado.');
        process.exit(0);
    });
});
