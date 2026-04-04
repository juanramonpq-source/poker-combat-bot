const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Serve static files from current directory
app.use(express.static(__dirname));

// Room storage
const rooms = new Map(); // code → { host, guest, hostNick, guestNick }

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('create_room', ({ nickname }) => {
    if (!nickname || !nickname.trim()) return socket.emit('room_error', 'Introduce tu nombre primero.');
    const code = generateCode();
    rooms.set(code, { host: socket.id, guest: null, hostNick: nickname.trim(), guestNick: null });
    socket.roomCode = code;
    socket.role = 'host';
    socket.join(code);
    socket.emit('room_created', { code });
    console.log(`Room ${code} created by ${nickname}`);
  });

  socket.on('join_room', ({ code, nickname }) => {
    if (!nickname || !nickname.trim()) return socket.emit('room_error', 'Introduce tu nombre primero.');
    const upperCode = (code || '').toUpperCase().trim();
    const room = rooms.get(upperCode);
    if (!room) return socket.emit('room_error', 'Sala no encontrada. Verifica el código.');
    if (room.guest) return socket.emit('room_error', 'Sala completa. Inténtalo con otro código.');
    room.guest = socket.id;
    room.guestNick = nickname.trim();
    socket.roomCode = upperCode;
    socket.role = 'guest';
    socket.join(upperCode);
    socket.emit('room_joined', { code: upperCode, opponentNick: room.hostNick });
    io.to(room.host).emit('guest_joined', { opponentNick: room.guestNick });
    console.log(`Room ${upperCode}: ${room.hostNick} vs ${room.guestNick}`);
  });

  socket.on('state_update', (data) => {
    if (socket.role !== 'host' || !socket.roomCode) return;
    socket.to(socket.roomCode).emit('state_update', data);
  });

  socket.on('player_action', (action) => {
    if (socket.role !== 'guest' || !socket.roomCode) return;
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    io.to(room.host).emit('player_action', action);
  });

  socket.on('disconnect', () => {
    if (!socket.roomCode) return;
    const room = rooms.get(socket.roomCode);
    if (room) {
      socket.to(socket.roomCode).emit('opponent_disconnected');
      rooms.delete(socket.roomCode);
      console.log(`Room ${socket.roomCode} closed.`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Poker Combat server running on port ${PORT}`));
