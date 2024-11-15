const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = {};
let usernames = new Set(); // To track taken usernames

app.use(express.static('public'));

// Send all current players to a new player on connection
io.on('connection', (socket) => {
    console.log('a user connected');
    
    // Create initial player object
    players[socket.id] = { id: socket.id, name: '', x: 100, y: 100, color: 'green', lastActive: Date.now() };

    // Wait for start before actually adding the player to the game
    socket.on('startGame', (data) => {
        // Check if username is taken
        if (usernames.has(data.name)) {
            socket.emit('usernameTaken', { message: "That username is already taken!" });
            return;
        }

        // Add the player
        players[socket.id].name = data.name;
        players[socket.id].color = data.color;
        usernames.add(data.name);

        // Notify all players of new player
        io.emit('newPlayer', {
            id: socket.id,
            x: players[socket.id].x,
            y: players[socket.id].y,
            color: data.color,
            name: data.name
        });

        // Send all players info to the new player
        io.to(socket.id).emit('currentPlayers', players);
    });

    // Player movement
    socket.on('playerMovement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].lastActive = Date.now(); // Update last active time
            socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, y: data.y });
        }
    });

    // Chat message
    socket.on('chatMessage', (message) => {
        // Broadcast to all players, including the sender
        io.emit('chatMessage', `${players[socket.id].name}: ${message}`);
    });

    // Kick player manually
    socket.on('kickPlayer', (data) => {
        const playerToKick = Object.values(players).find(player => player.name === data.targetName);
        if (playerToKick) {
            io.to(playerToKick.id).emit('kicked', { message: 'You have been kicked from the game!' });
            delete players[playerToKick.id];
            usernames.delete(playerToKick.name);
            io.emit('removePlayer', playerToKick.id);
        }
    });

    // Check AFK status every 10 seconds
    setInterval(() => {
        for (const id in players) {
            if (Date.now() - players[id].lastActive > 120000) { // 2 minutes
                io.to(players[id].id).emit('kicked', { message: 'You were kicked for being AFK!' });
                delete players[id];
                usernames.delete(players[id].name);
                io.emit('removePlayer', id);
            }
        }
    }, 10000);

    // When player disconnects
    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (players[socket.id]) {
            usernames.delete(players[socket.id].name); // Remove username
            delete players[socket.id];
        }
        io.emit('removePlayer', socket.id);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
