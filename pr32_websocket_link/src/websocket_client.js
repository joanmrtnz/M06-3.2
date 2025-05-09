require('dotenv').config();
const { randomUUID } = require('crypto');

const WebSocket = require('ws');
const readline = require('readline');

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8000';
const ws = new WebSocket(SERVER_URL);

let player = { id: "player_" + randomUUID(), game: 1, x: 0, y: 0 };
// 3 jugador es mou amb les fletxes al client
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);


ws.on('open', () => {
    console.log('Conectado al servidor WebSocket');
    console.log('Usa las flechas para moverte, q para salir');
    //3 update x/y
    process.stdin.on('keypress', (str, key) => {
        if (key.name === 'up') player.y--;
        if (key.name === 'down') player.y++;
        if (key.name === 'left') player.x--;
        if (key.name === 'right') player.x++;

        const message = JSON.stringify({ type: 'move', player });
        // 4 client envia la posició en JSON
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
            const distancia = typeof data.distance === 'number'
                ? ` Distancia recorrida: ${data.distance.toFixed(2)}`
                : '';
            console.log(`${data.message}.${distancia}`);
        
            // reiniciar estado del jugador para la siguiente partida
            player.game++;
            player.x = 0;
            player.y = 0;
            console.log(`Nuevo game ${player.game}, posiciones reiniciadas.`);
        
        }
        
        else if (data.type === 'welcome') {
            console.log(data.message);
        }
        else {
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
