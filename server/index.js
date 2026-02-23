import { WebSocketServer } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { ClientMsg, ServerMsg } from './protocol.js'

const PORT = process.env.PORT || 3001
const HEARTBEAT_INTERVAL = 30000

// ---- Room & Player State ----

/** @type {Map<string, Room>} */
const rooms = new Map()

/** @type {Map<WebSocket, PlayerConnection>} */
const connections = new Map()

/**
 * @typedef {Object} PlayerConnection
 * @property {string} id
 * @property {string} name
 * @property {string|null} roomId
 * @property {WebSocket} ws
 * @property {boolean} alive
 */

/**
 * @typedef {Object} RoomPlayer
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {number|null} characterIndex
 * @property {boolean} ready
 * @property {boolean} isHost
 * @property {boolean} connected
 */

/**
 * @typedef {Object} Room
 * @property {string} id
 * @property {string} hostId
 * @property {RoomPlayer[]} players
 * @property {'lobby'|'playing'} status
 * @property {Object|null} gameState - Full authoritative game state (server-only)
 * @property {number} createdAt
 */

// ---- WebSocket Server ----

const wss = new WebSocketServer({ port: PORT })

console.log(`[Neol Block WS] Server running on port ${PORT}`)

wss.on('connection', (ws) => {
  const playerId = uuidv4()
  /** @type {PlayerConnection} */
  const conn = {
    id: playerId,
    name: '',
    roomId: null,
    ws,
    alive: true,
  }
  connections.set(ws, conn)

  send(ws, ServerMsg.CONNECTED, { playerId })
  console.log(`[Connect] Player ${playerId.slice(0, 8)}`)

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      handleMessage(ws, conn, msg)
    } catch (err) {
      console.error('[Message Error]', err.message)
      send(ws, ServerMsg.ERROR, { message: 'Invalid message format' })
    }
  })

  ws.on('close', () => {
    handleDisconnect(conn)
    connections.delete(ws)
    console.log(`[Disconnect] Player ${playerId.slice(0, 8)}`)
  })

  ws.on('pong', () => {
    conn.alive = true
  })
})

// ---- Heartbeat ----
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    const conn = connections.get(ws)
    if (!conn || !conn.alive) {
      ws.terminate()
      return
    }
    conn.alive = false
    ws.ping()
  })
}, HEARTBEAT_INTERVAL)

wss.on('close', () => clearInterval(heartbeat))

// ---- Message Handler ----

function handleMessage(ws, conn, msg) {
  const { type, payload = {} } = msg

  switch (type) {
    // ---- Lobby ----
    case ClientMsg.CREATE_ROOM:
      handleCreateRoom(ws, conn, payload)
      break
    case ClientMsg.JOIN_ROOM:
      handleJoinRoom(ws, conn, payload)
      break
    case ClientMsg.LEAVE_ROOM:
      handleLeaveRoom(conn)
      break
    case ClientMsg.SET_COLOR:
      handleSetColor(conn, payload)
      break
    case ClientMsg.SET_CHARACTER:
      handleSetCharacter(conn, payload)
      break
    case ClientMsg.SET_READY:
      handleSetReady(conn, payload)
      break
    case ClientMsg.START_GAME:
      handleStartGame(conn)
      break

    // ---- Draft ----
    case ClientMsg.DRAFT_PLACE:
      handleDraftPlace(conn, payload)
      break
    case ClientMsg.DRAFT_AUTO:
      handleDraftAuto(conn)
      break

    // ---- State Broadcast (Host → all others) ----
    case ClientMsg.BROADCAST_STATE:
      handleBroadcastState(conn, payload)
      break

    // ---- Game Actions ----
    case ClientMsg.USE_SKILL:
    case ClientMsg.SKIP_SKILL:
    case ClientMsg.CHOOSE_ACTION:
    case ClientMsg.SELECT_HAND_CHIP:
    case ClientMsg.CLICK_BOARD_CELL:
    case ClientMsg.BUY_FACE_UP:
    case ClientMsg.BUY_BLIND:
    case ClientMsg.RECYCLE_DISCARD:
    case ClientMsg.RECYCLE_KEEP:
    case ClientMsg.SKILL_BOARD_CLICK:
    case ClientMsg.END_TURN:
    case ClientMsg.MINE_MODAL_CLOSE:
      handleGameAction(conn, type, payload)
      break

    // ---- Chat ----
    case ClientMsg.CHAT:
      handleChat(conn, payload)
      break

    // ---- Heartbeat ----
    case ClientMsg.PING:
      send(ws, ServerMsg.PONG, {})
      break

    default:
      send(ws, ServerMsg.ERROR, { message: `Unknown message type: ${type}` })
  }
}

// ---- Lobby Handlers ----

function handleCreateRoom(ws, conn, { playerName }) {
  if (conn.roomId) {
    handleLeaveRoom(conn)
  }

  const roomId = generateRoomCode()
  const room = {
    id: roomId,
    hostId: conn.id,
    players: [{
      id: conn.id,
      name: playerName || 'Player 1',
      color: 'RED',
      characterIndex: null,
      ready: false,
      isHost: true,
      connected: true,
    }],
    status: 'lobby',
    gameState: null,
    createdAt: Date.now(),
  }

  rooms.set(roomId, room)
  conn.roomId = roomId
  conn.name = playerName || 'Player 1'

  send(ws, ServerMsg.ROOM_CREATED, { roomId })
  sendRoomState(room)

  console.log(`[Room] Created ${roomId} by ${conn.id.slice(0, 8)}`)
}

function handleJoinRoom(ws, conn, { roomId, playerName }) {
  if (conn.roomId) {
    handleLeaveRoom(conn)
  }

  const room = rooms.get(roomId?.toUpperCase())
  if (!room) {
    send(ws, ServerMsg.ERROR, { message: 'Room not found' })
    return
  }

  if (room.status !== 'lobby') {
    // Check if this is a reconnection
    const existing = room.players.find((p) => p.name === playerName && !p.connected)
    if (existing) {
      existing.connected = true
      existing.id = conn.id
      conn.roomId = room.id
      conn.name = playerName
      sendRoomState(room)
      if (room.gameState) {
        sendPersonalizedGameState(room, conn.id)
      }
      console.log(`[Room] ${conn.id.slice(0, 8)} reconnected to ${room.id}`)
      return
    }
    send(ws, ServerMsg.ERROR, { message: 'Game already in progress' })
    return
  }

  if (room.players.length >= 6) {
    send(ws, ServerMsg.ERROR, { message: 'Room is full (max 6 players)' })
    return
  }

  const usedColors = room.players.map((p) => p.color)
  const allColors = ['RED', 'BLUE', 'YELLOW', 'GREEN', 'PURPLE', 'ORANGE']
  const availableColor = allColors.find((c) => !usedColors.includes(c)) || 'RED'

  room.players.push({
    id: conn.id,
    name: playerName || `Player ${room.players.length + 1}`,
    color: availableColor,
    characterIndex: null,
    ready: false,
    isHost: false,
    connected: true,
  })

  conn.roomId = room.id
  conn.name = playerName || `Player ${room.players.length}`

  sendRoomState(room)
  console.log(`[Room] ${conn.id.slice(0, 8)} joined ${room.id}`)
}

function handleLeaveRoom(conn) {
  const room = rooms.get(conn.roomId)
  if (!room) return

  room.players = room.players.filter((p) => p.id !== conn.id)
  conn.roomId = null

  if (room.players.length === 0) {
    rooms.delete(room.id)
    console.log(`[Room] Deleted empty room ${room.id}`)
    return
  }

  // Transfer host if needed
  if (room.hostId === conn.id) {
    room.hostId = room.players[0].id
    room.players[0].isHost = true
  }

  broadcastToRoom(room, ServerMsg.PLAYER_LEFT, { playerId: conn.id })
  sendRoomState(room)
}

function handleSetColor(conn, { color }) {
  const room = rooms.get(conn.roomId)
  if (!room || room.status !== 'lobby') return

  const player = room.players.find((p) => p.id === conn.id)
  if (!player) return

  // Check if color is taken
  const taken = room.players.some((p) => p.id !== conn.id && p.color === color)
  if (taken) {
    send(conn.ws, ServerMsg.ERROR, { message: 'Color already taken' })
    return
  }

  player.color = color
  sendRoomState(room)
}

function handleSetCharacter(conn, { characterIndex }) {
  const room = rooms.get(conn.roomId)
  if (!room || room.status !== 'lobby') return

  const player = room.players.find((p) => p.id === conn.id)
  if (!player) return

  // Check if character is taken
  const taken = room.players.some((p) => p.id !== conn.id && p.characterIndex === characterIndex)
  if (taken) {
    send(conn.ws, ServerMsg.ERROR, { message: 'Character already taken' })
    return
  }

  player.characterIndex = characterIndex
  sendRoomState(room)
}

function handleSetReady(conn, { ready }) {
  const room = rooms.get(conn.roomId)
  if (!room || room.status !== 'lobby') return

  const player = room.players.find((p) => p.id === conn.id)
  if (!player) return

  player.ready = ready
  sendRoomState(room)
}

function handleStartGame(conn) {
  const room = rooms.get(conn.roomId)
  if (!room || room.status !== 'lobby') return
  if (room.hostId !== conn.id) {
    send(conn.ws, ServerMsg.ERROR, { message: 'Only host can start the game' })
    return
  }
  if (room.players.length < 2) {
    send(conn.ws, ServerMsg.ERROR, { message: 'Need at least 2 players' })
    return
  }

  room.status = 'playing'
  // Game initialization happens on client side - server acts as relay with validation
  // The host's client will run initializeGame and broadcast the state
  broadcastToRoom(room, ServerMsg.GAME_ACTION, {
    action: 'game_started',
    playerOrder: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      characterIndex: p.characterIndex,
    })),
  })

  console.log(`[Game] Started in room ${room.id} with ${room.players.length} players`)
}

// ---- Draft Handlers ----

function handleDraftPlace(conn, payload) {
  handleGameAction(conn, ClientMsg.DRAFT_PLACE, payload)
}

function handleDraftAuto(conn) {
  handleGameAction(conn, ClientMsg.DRAFT_AUTO, {})
}

// ---- Game Action Handler (Relay Mode) ----

function handleGameAction(conn, actionType, payload) {
  const room = rooms.get(conn.roomId)
  if (!room) return

  // Relay the action to all players in the room
  broadcastToRoom(room, ServerMsg.GAME_ACTION, {
    action: actionType,
    playerId: conn.id,
    payload,
  })
}

// ---- State Broadcast Handler ----

function handleBroadcastState(conn, payload) {
  const room = rooms.get(conn.roomId)
  if (!room) return

  // Only the host can broadcast state
  if (room.hostId !== conn.id) {
    send(conn.ws, ServerMsg.ERROR, { message: 'Only host can broadcast state' })
    return
  }

  // Forward the game state snapshot to ALL players (including host for confirmation)
  broadcastToRoom(room, ServerMsg.GAME_STATE, {
    snapshot: payload.snapshot,
    fromHost: conn.id,
  })
}

// ---- Chat Handler ----

function handleChat(conn, { message }) {
  const room = rooms.get(conn.roomId)
  if (!room || !message) return

  broadcastToRoom(room, ServerMsg.CHAT, {
    playerId: conn.id,
    playerName: conn.name,
    message: message.slice(0, 200), // Limit message length
    timestamp: Date.now(),
  })
}

// ---- Disconnect Handler ----

function handleDisconnect(conn) {
  const room = rooms.get(conn.roomId)
  if (!room) return

  const player = room.players.find((p) => p.id === conn.id)
  if (!player) return

  if (room.status === 'lobby') {
    handleLeaveRoom(conn)
  } else {
    // Mark as disconnected but keep the player in the game for reconnection
    player.connected = false
    broadcastToRoom(room, ServerMsg.PLAYER_UPDATED, {
      playerId: conn.id,
      changes: { connected: false },
    })
  }
}

// ---- Helper Functions ----

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }))
  }
}

function broadcastToRoom(room, type, payload) {
  for (const player of room.players) {
    const conn = findConnection(player.id)
    if (conn) {
      send(conn.ws, type, payload)
    }
  }
}

function sendRoomState(room) {
  const state = {
    id: room.id,
    hostId: room.hostId,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      characterIndex: p.characterIndex,
      ready: p.ready,
      isHost: p.isHost,
      connected: p.connected,
    })),
  }

  broadcastToRoom(room, ServerMsg.ROOM_STATE, { room: state })
}

function sendPersonalizedGameState(room, playerId) {
  // TODO: When full server-side game state is implemented,
  // send personalized view (hide other players' hands)
  const conn = findConnection(playerId)
  if (conn) {
    send(conn.ws, ServerMsg.GAME_STATE, { gameState: room.gameState })
  }
}

function findConnection(playerId) {
  for (const [, conn] of connections) {
    if (conn.id === playerId) return conn
  }
  return null
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  // Ensure uniqueness
  if (rooms.has(code)) return generateRoomCode()
  return code
}

// ---- Cleanup stale rooms (every 5 min) ----
setInterval(() => {
  const now = Date.now()
  const STALE_TIMEOUT = 2 * 60 * 60 * 1000 // 2 hours
  for (const [id, room] of rooms) {
    if (now - room.createdAt > STALE_TIMEOUT && room.players.every((p) => !p.connected)) {
      rooms.delete(id)
      console.log(`[Cleanup] Removed stale room ${id}`)
    }
  }
}, 5 * 60 * 1000)
