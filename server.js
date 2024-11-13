const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = {}; // Store players

app.use(express.static('public'));

// Helper function to calculate a point on a cubic Bezier curve
function calculateBezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = (uuu * p0.x) + (3 * uu * t * p1.x) + (3 * u * tt * p2.x) + (ttt * p3.x);
    const y = (uuu * p0.y) + (3 * uu * t * p1.y) + (3 * u * tt * p2.y) + (ttt * p3.y);
    return { x, y };
}

// Smooth path function using Bezier curves
function smoothPath(playerId, newPosition) {
    if (!players[playerId].positions) players[playerId].positions = [];

    players[playerId].positions.push(newPosition);
    if (players[playerId].positions.length > 4) players[playerId].positions.shift();

    if (players[playerId].positions.length === 4) {
        const [p0, p1, p2, p3] = players[playerId].positions;
        const smoothPositions = [];

        for (let t = 0; t <= 1; t += 0.1) {
            const point = calculateBezierPoint(t, p0, p1, p2, p3);
            smoothPositions.push(point);
        }

        smoothPositions.forEach((pos, index) => {
            setTimeout(() => {
                io.emit('playerMoved', { id: playerId, x: pos.x, y: pos.y });
            }, index * 50);
        });
    }
}

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    players[socket.id] = { x: Math.random() * 600, y: Math.random() * 400, size: 30, color: 'blue', positions: [] };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            smoothPath(socket.id, movementData);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
