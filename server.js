const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = {};
let bullets = [];
const BULLET_SPEED = 5;
const PLAYER_HEALTH = 100;
const PLAYER_SIZE = 30;

app.use(express.static('public'));

function updateBullets() {
    bullets.forEach(bullet => {
        bullet.x += BULLET_SPEED * Math.cos(bullet.angle);
        bullet.y += BULLET_SPEED * Math.sin(bullet.angle);

        // Check for bullet collisions with players
        for (const id in players) {
            const player = players[id];
            if (Math.hypot(bullet.x - player.x, bullet.y - player.y) < PLAYER_SIZE) {
                player.health -= 20; // Damage per hit
                if (player.health <= 0) {
                    player.health = PLAYER_HEALTH;
                    player.x = Math.random() * 800;
                    player.y = Math.random() * 600;
                }
                bullets = bullets.filter(b => b !== bullet); // Remove bullet on hit
                break;
            }
        }
    });

    // Remove bullets that go out of bounds
    bullets = bullets.filter(bullet => bullet.x >= 0 && bullet.x <= 800 && bullet.y >= 0 && bullet.y <= 600);
}

setInterval(() => {
    updateBullets();
    io.emit('updateGameState', { players, bullets });
}, 16);

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    players[socket.id] = {
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: PLAYER_SIZE,
        color: 'blue',
        health: PLAYER_HEALTH,
        rotation: 0
    };

    socket.on('playerMovement', (data) => {
        const player = players[socket.id];
        if (player) {
            player.x += data.velocityX;
            player.y += data.velocityY;
            player.rotation = data.rotation;
            if (player.x < 0) player.x = 0;
            if (player.y < 0) player.y = 0;
            if (player.x + player.size > 800) player.x = 800 - player.size;
            if (player.y + player.size > 600) player.y = 600 - player.size;
        }
    });

    socket.on('shootBullet', (data) => {
        bullets.push({ x: data.x, y: data.y, angle: data.angle, size: 5 });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log(`Player disconnected: ${socket.id}`);
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
