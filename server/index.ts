import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { GameState } from '../src/engine/types';
import {
  createInitialGameState,
  addPlayer,
  startNewRound,
  handleDiscard,
  handleDrawFromDeck,
  handleDrawFromDiscard,
  handleDiscoverPick,
  handleDeclare,
} from '../src/engine/gameEngine';
import { makeAiMove } from '../src/engine/aiPlayer';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// In-memory room store
const rooms = new Map<string, GameState>();
const socketToRoom = new Map<string, string>();
const socketToPlayer = new Map<string, string>();

function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function broadcastState(roomCode: string, state: GameState) {
  // Emit full state to each player with their specific hand visible
  for (const player of state.players) {
    if (player.isAi) continue;
    const socketEntry = [...socketToPlayer.entries()].find(([, pid]) => pid === player.id);
    if (!socketEntry) continue;
    const socketId = socketEntry[0];

    // Mask other players' hands for security
    const maskedState = {
      ...state,
      drawDeck: state.drawDeck.map(() => null), // hide deck contents
      players: state.players.map(p => ({
        ...p,
        hand: p.id === player.id ? p.hand : p.hand.map(() => null as any),
      })),
    };

    io.to(socketId).emit('gameState', maskedState);
  }

  // Also broadcast to spectators
  io.to(`spectator:${roomCode}`).emit('spectatorState', {
    ...state,
    drawDeck: state.drawDeck.map(() => null),
    players: state.players.map(p => ({
      ...p,
      hand: p.hand.map(() => null),
    })),
  });
}

function runAiTurns(roomCode: string, state: GameState): GameState {
  let currentState = state;
  let iterations = 0;

  while (iterations < 50) {
    if (currentState.phase !== 'PLAYER_TURN' && currentState.phase !== 'WAITING_DRAW') break;
    const currentPlayer = currentState.players[currentState.currentTurnIndex];
    if (!currentPlayer || !currentPlayer.isAi) break;
    currentState = makeAiMove(currentState, currentPlayer.id);
    iterations++;
  }

  return currentState;
}

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  // CREATE ROOM
  socket.on('createRoom', ({ playerName, config }: { playerName: string; config?: object }) => {
    const roomCode = generateRoomCode();
    let state = createInitialGameState(config as any);
    state = addPlayer(state, playerName, false, true);

    const myPlayerId = state.players[state.players.length - 1].id;
    rooms.set(roomCode, state);
    socketToRoom.set(socket.id, roomCode);
    socketToPlayer.set(socket.id, myPlayerId);

    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, myPlayerId });
    broadcastState(roomCode, state);
  });

  // JOIN ROOM
  socket.on('joinRoom', ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
    const state = rooms.get(roomCode);
    if (!state) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (state.phase !== 'LOBBY') {
      socket.emit('error', 'Game already in progress');
      return;
    }

    const newState = addPlayer(state, playerName, false, false);
    const myPlayerId = newState.players[newState.players.length - 1].id;
    rooms.set(roomCode, newState);
    socketToRoom.set(socket.id, roomCode);
    socketToPlayer.set(socket.id, myPlayerId);

    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode, myPlayerId });
    broadcastState(roomCode, newState);
  });

  // SPECTATE
  socket.on('spectate', ({ roomCode }: { roomCode: string }) => {
    socket.join(`spectator:${roomCode}`);
    const state = rooms.get(roomCode);
    if (state) {
      socket.emit('spectatorState', {
        ...state,
        drawDeck: state.drawDeck.map(() => null),
        players: state.players.map(p => ({ ...p, hand: p.hand.map(() => null) })),
      });
    }
  });

  // ADD AI BOT
  socket.on('addBot', ({ botName }: { botName: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    const state = rooms.get(roomCode);
    if (!state || state.phase !== 'LOBBY') return;

    const newState = addPlayer(state, botName || `Bot ${state.players.filter(p => p.isAi).length + 1}`, true, false);
    rooms.set(roomCode, newState);
    broadcastState(roomCode, newState);
  });

  // START GAME
  socket.on('startGame', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    const state = rooms.get(roomCode);
    if (!state) return;

    const activePlayers = state.players.filter(p => !p.isEliminated);
    if (activePlayers.length < 2) {
      socket.emit('error', 'Need at least 2 players to start');
      return;
    }

    let newState = startNewRound(state);
    newState = runAiTurns(roomCode, newState);
    rooms.set(roomCode, newState);
    broadcastState(roomCode, newState);
  });

  // NEXT ROUND
  socket.on('nextRound', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    const state = rooms.get(roomCode);
    if (!state || state.phase !== 'ROUND_END') return;

    let newState = startNewRound(state);
    newState = runAiTurns(roomCode, newState);
    rooms.set(roomCode, newState);
    broadcastState(roomCode, newState);
  });

  // DISCARD
  socket.on('discard', ({ cardIds }: { cardIds: string[] }) => {
    const roomCode = socketToRoom.get(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!roomCode || !playerId) return;

    const state = rooms.get(roomCode);
    if (!state) return;

    const newState = handleDiscard(state, playerId, cardIds);
    if (!newState) {
      socket.emit('error', 'Invalid discard');
      return;
    }

    const afterAi = runAiTurns(roomCode, newState);
    rooms.set(roomCode, afterAi);
    broadcastState(roomCode, afterAi);
  });

  // DRAW FROM DECK
  socket.on('drawFromDeck', () => {
    const roomCode = socketToRoom.get(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!roomCode || !playerId) return;

    const state = rooms.get(roomCode);
    if (!state) return;

    const newState = handleDrawFromDeck(state, playerId);
    if (!newState) {
      socket.emit('error', 'Cannot draw now');
      return;
    }

    const afterAi = runAiTurns(roomCode, newState);
    rooms.set(roomCode, afterAi);
    broadcastState(roomCode, afterAi);
  });

  // DRAW FROM DISCARD
  socket.on('drawFromDiscard', ({ cardId }: { cardId: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!roomCode || !playerId) return;

    const state = rooms.get(roomCode);
    if (!state) return;

    const newState = handleDrawFromDiscard(state, playerId, cardId);
    if (!newState) {
      socket.emit('error', 'Cannot pick that card');
      return;
    }

    const afterAi = runAiTurns(roomCode, newState);
    rooms.set(roomCode, afterAi);
    broadcastState(roomCode, afterAi);
  });

  // DISCOVER PICK
  socket.on('discoverPick', ({ cardId }: { cardId: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!roomCode || !playerId) return;

    const state = rooms.get(roomCode);
    if (!state) return;

    const newState = handleDiscoverPick(state, playerId, cardId);
    if (!newState) {
      socket.emit('error', 'Cannot pick that card from discard');
      return;
    }

    const afterAi = runAiTurns(roomCode, newState);
    rooms.set(roomCode, afterAi);
    broadcastState(roomCode, afterAi);
  });

  // DECLARE
  socket.on('declare', () => {
    const roomCode = socketToRoom.get(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!roomCode || !playerId) return;

    const state = rooms.get(roomCode);
    if (!state) return;

    const newState = handleDeclare(state, playerId);
    if (!newState) {
      socket.emit('error', 'Cannot declare now. Hand point total must be 7 or lower.');
      return;
    }

    rooms.set(roomCode, newState);
    broadcastState(roomCode, newState);
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socketToRoom.delete(socket.id);
    socketToPlayer.delete(socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`MINIMIZE server running on http://localhost:${PORT}`);
});
