const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 30000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve the main HTML file at root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/poker_combat_bot_ONLINE.html');
});

// Fallback: serve HTML for any route not matching a static file
// This helps with relative paths for audio files
app.get('*', (req, res) => {
  // Check if it looks like a request for a file (has an extension)
  if (req.path.includes('.')) {
    res.status(404).send('Not found');
  } else {
    // Otherwise serve the HTML (for SPA-like behavior)
    res.sendFile(__dirname + '/poker_combat_bot_ONLINE.html');
  }
});

// Room storage
const rooms = new Map(); // code → room
const ROOM_RECONNECT_GRACE_MS = 60 * 1000;

function createSessionId() {
  return crypto.randomBytes(12).toString('hex');
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function normalizeRole(role) {
  return role === 'host' || role === 'guest' ? role : null;
}

function getOpponentRole(role) {
  return role === 'host' ? 'guest' : 'host';
}

function getOpponentNickname(room, role) {
  return role === 'host' ? room.guestNick : room.hostNick;
}

function clearRoomCloseTimer(room) {
  if (!room?.closeTimer) return;
  clearTimeout(room.closeTimer);
  room.closeTimer = null;
}

function attachSocketToRoom(socket, room, code, role) {
  const currentRole = normalizeRole(role);
  if (!currentRole) return;
  room[currentRole] = socket.id;
  room[`${currentRole}DisconnectedAt`] = null;
  socket.roomCode = code;
  socket.role = currentRole;
  socket.join(code);
}

function emitOpponentConnectionState(code, room, role, status) {
  const opponentRole = getOpponentRole(role);
  const opponentSocketId = room[opponentRole];
  if (!opponentSocketId) return;
  io.to(opponentSocketId).emit('opponent_connection_state', {
    role,
    status,
    graceMs: ROOM_RECONNECT_GRACE_MS,
    nickname: room[`${role}Nick`] || 'Rival'
  });
}

function scheduleRoomCleanup(code) {
  const room = rooms.get(code);
  if (!room) return;
  clearRoomCloseTimer(room);
  room.closeTimer = setTimeout(() => {
    const latestRoom = rooms.get(code);
    if (!latestRoom) return;
    const hostOffline = !latestRoom.host;
    const guestOffline = !latestRoom.guest;
    if (!hostOffline && !guestOffline) return;
    if (latestRoom.host) {
      io.to(latestRoom.host).emit('opponent_disconnected');
    }
    if (latestRoom.guest) {
      io.to(latestRoom.guest).emit('opponent_disconnected');
    }
    rooms.delete(code);
    console.log(`Room ${code} closed after reconnect grace timeout.`);
  }, ROOM_RECONNECT_GRACE_MS);
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('create_room', ({ nickname, sessionId }) => {
    if (!nickname || !nickname.trim()) return socket.emit('room_error', 'Introduce tu nombre primero.');
    const code = generateCode();
    const hostSessionId = sessionId || createSessionId();
    const room = {
      host: null,
      guest: null,
      hostNick: nickname.trim(),
      guestNick: null,
      hostSessionId,
      guestSessionId: null,
      hostDisconnectedAt: null,
      guestDisconnectedAt: null,
      closeTimer: null
    };
    rooms.set(code, room);
    attachSocketToRoom(socket, room, code, 'host');
    socket.emit('room_created', { code, sessionId: hostSessionId });
    console.log(`Room ${code} created by ${nickname}`);
  });

  socket.on('join_room', ({ code, nickname, sessionId }) => {
    if (!nickname || !nickname.trim()) return socket.emit('room_error', 'Introduce tu nombre primero.');
    const upperCode = (code || '').toUpperCase().trim();
    const room = rooms.get(upperCode);
    if (!room) return socket.emit('room_error', 'Sala no encontrada. Verifica el código.');
    if (room.guest || room.guestSessionId) return socket.emit('room_error', 'Sala completa. Inténtalo con otro código.');
    room.guestSessionId = sessionId || createSessionId();
    room.guestNick = nickname.trim();
    attachSocketToRoom(socket, room, upperCode, 'guest');
    socket.emit('room_joined', {
      code: upperCode,
      opponentNick: room.hostNick,
      sessionId: room.guestSessionId
    });
    io.to(room.host).emit('guest_joined', { opponentNick: room.guestNick });
    console.log(`Room ${upperCode}: ${room.hostNick} vs ${room.guestNick}`);
  });

  socket.on('rejoin_room', ({ code, role, sessionId, nickname }) => {
    const upperCode = (code || '').toUpperCase().trim();
    const normalizedRole = normalizeRole(role);
    if (!upperCode || !normalizedRole || !sessionId) {
      return socket.emit('room_error', 'No se pudo recuperar la sala.');
    }
    const room = rooms.get(upperCode);
    if (!room) return socket.emit('room_error', 'La sala ya no está disponible.');
    const expectedSessionId = room[`${normalizedRole}SessionId`];
    if (!expectedSessionId || expectedSessionId !== sessionId) {
      return socket.emit('room_error', 'La sesión online ya no coincide con esta sala.');
    }

    if (nickname && typeof nickname === 'string') {
      room[`${normalizedRole}Nick`] = nickname.trim() || room[`${normalizedRole}Nick`];
    }

    attachSocketToRoom(socket, room, upperCode, normalizedRole);
    clearRoomCloseTimer(room);
    socket.emit('room_rejoined', {
      code: upperCode,
      role: normalizedRole,
      opponentNick: getOpponentNickname(room, normalizedRole) || 'Rival'
    });
    emitOpponentConnectionState(upperCode, room, normalizedRole, 'reconnected');
    console.log(`Room ${upperCode}: ${normalizedRole} rejoined.`);
  });

  socket.on('state_update', (data) => {
    if (socket.role !== 'host' || !socket.roomCode) return;
    const room = rooms.get(socket.roomCode);
    if (!room?.guest) return;
    io.to(room.guest).emit('state_update', data);
  });

  socket.on('player_action', (action) => {
    if (socket.role !== 'guest' || !socket.roomCode) return;
    const room = rooms.get(socket.roomCode);
    if (!room || !room.host) return;
    io.to(room.host).emit('player_action', action);
  });

  socket.on('disconnect', () => {
    if (!socket.roomCode) return;
    const code = socket.roomCode;
    const room = rooms.get(code);
    const role = normalizeRole(socket.role);
    if (!room || !role) return;
    if (room[role] !== socket.id) return;

    room[role] = null;
    room[`${role}DisconnectedAt`] = Date.now();
    emitOpponentConnectionState(code, room, role, 'reconnecting');
    scheduleRoomCleanup(code);
    console.log(`Room ${code}: ${role} disconnected, waiting ${ROOM_RECONNECT_GRACE_MS}ms for rejoin.`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Poker Combat server running on port ${PORT}`));
