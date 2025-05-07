require('dotenv').config();
const { randomUUID } = require('crypto');

const WebSocket = require('ws');
const readline = require('readline');

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8000';
const ws = new WebSocket(SERVER_URL);

let player = { id: "player_" + randomUUID(), game: 1, x: 0, y: 0 };
// Recoger el pulsado de teclas
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);


ws.on('open', () => {
    console.log('Conectado al servidor WebSocket');
    console.log('Usa las flechas para moverte, q para salir');

    process.stdin.on('keypress', (str, key) => {
        if (key.name === 'up') player.y--;
        if (key.name === 'down') player.y++;
        if (key.name === 'left') player.x--;
        if (key.name === 'right') player.x++;

        const message = JSON.stringify({ type: 'move', player });
        ws.send(message);

        console.log(`Nueva posición: x=${player.x}, y=${player.y}`);

        // q para salir
        if (key.name === 'q') {
            console.log('Saliendo...');
            process.exit();
        }
    });
});

ws.on('message', (message) => {
    try {
        const data = JSON.parse(message.toString);
        
        if (data.type === 'lost') {
            console.log(data.message);
            player.game++;
            player.x = 0;
            player.y = 0;
            console.log(`Nuevo game ${player.game}, posiciones reiniciadas.`);
        } else {
            console.log(`Mensaje recibido del servidor: ${message.toString()}`);
        }
    } catch (error) {
        console.error('Error: el mensaje no es un JSON válido:', message.toString());
    }
});

ws.on('close', () => {
    console.log('Conexión cerrada');
});

ws.on('error', (error) => {
    console.error('Error en la conexión:', error);
});
