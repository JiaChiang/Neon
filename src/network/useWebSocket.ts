import { ref, readonly, computed } from 'vue'
import { ClientMsg, ServerMsg } from './protocol'
import type { RoomState, ChatMessage, WSMessage } from './protocol'
import { serializeGameState, deserializeGameState } from './stateSync'
import type { GameSnapshot } from './stateSync'

const RECONNECT_DELAY = 2000
const MAX_RECONNECT_ATTEMPTS = 5
const PING_INTERVAL = 25000

// ---- Singleton state (shared across all components) ----
const ws = ref<WebSocket | null>(null)
const isConnected = ref(false)
const playerId = ref<string | null>(null)
const roomState = ref<RoomState | null>(null)
const chatMessages = ref<ChatMessage[]>([])
const lastError = ref<string | null>(null)
const isMultiplayer = ref(false)

// Event listeners
type MessageHandler = (payload: Record<string, unknown>) => void
const messageHandlers = new Map<string, Set<MessageHandler>>()

let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null
let serverUrl = ''

// ---- Computed ----
const isHost = computed(() => {
  if (!roomState.value || !playerId.value) return false
  return roomState.value.hostId === playerId.value
})

const myRoomPlayer = computed(() => {
  if (!roomState.value || !playerId.value) return null
  return roomState.value.players.find((p) => p.id === playerId.value) ?? null
})

// ---- Connection Management ----

function connect(url?: string) {
  if (url) serverUrl = url
  if (!serverUrl) {
    // Default: same host, port 3001
    const loc = window.location
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:'
    serverUrl = `${protocol}//${loc.hostname}:3001`
  }

  if (ws.value && ws.value.readyState === WebSocket.OPEN) return

  try {
    const socket = new WebSocket(serverUrl)
    ws.value = socket

    socket.onopen = () => {
      isConnected.value = true
      isMultiplayer.value = true
      reconnectAttempts = 0
      lastError.value = null
      console.log('[WS] Connected to', serverUrl)

      // Start ping
      pingTimer = setInterval(() => {
        send(ClientMsg.PING, {})
      }, PING_INTERVAL)
    }

    socket.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        handleServerMessage(msg)
      } catch (err) {
        console.error('[WS] Parse error:', err)
      }
    }

    socket.onclose = () => {
      isConnected.value = false
      ws.value = null
      if (pingTimer) clearInterval(pingTimer)

      if (isMultiplayer.value && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++
        console.log(`[WS] Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`)
        reconnectTimer = setTimeout(() => connect(), RECONNECT_DELAY * reconnectAttempts)
      }
    }

    socket.onerror = (err) => {
      console.error('[WS] Error:', err)
      lastError.value = 'Connection error'
    }
  } catch (err) {
    console.error('[WS] Connect failed:', err)
    lastError.value = 'Failed to connect'
  }
}

function disconnect() {
  isMultiplayer.value = false
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (pingTimer) clearInterval(pingTimer)
  if (ws.value) {
    ws.value.close()
    ws.value = null
  }
  isConnected.value = false
  playerId.value = null
  roomState.value = null
  chatMessages.value = []
  reconnectAttempts = 0
}

function send(type: string, payload: Record<string, unknown>) {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({ type, payload }))
  }
}

// ---- Message Handler ----

function handleServerMessage(msg: WSMessage) {
  const { type, payload } = msg

  switch (type) {
    case ServerMsg.CONNECTED:
      playerId.value = payload.playerId as string
      break

    case ServerMsg.ERROR:
      lastError.value = payload.message as string
      console.warn('[WS] Server error:', payload.message)
      break

    case ServerMsg.ROOM_CREATED:
      // Room was created - state will come via ROOM_STATE
      break

    case ServerMsg.ROOM_STATE:
      roomState.value = payload.room as unknown as RoomState
      break

    case ServerMsg.PLAYER_LEFT:
      // Handled by ROOM_STATE refresh
      break

    case ServerMsg.PLAYER_UPDATED:
      if (roomState.value) {
        const p = roomState.value.players.find((pl) => pl.id === payload.playerId)
        if (p && payload.changes) {
          Object.assign(p, payload.changes)
        }
      }
      break

    case ServerMsg.GAME_STATE:
      // State broadcast from host - non-host clients apply it
      if (!isHost.value && payload.snapshot) {
        try {
          deserializeGameState(payload.snapshot as unknown as GameSnapshot)
          console.log('[WS] Game state synced from host')
        } catch (err) {
          console.error('[WS] Failed to apply game state:', err)
        }
      }
      break

    case ServerMsg.CHAT:
      chatMessages.value.push(payload as unknown as ChatMessage)
      // Keep last 100 messages
      if (chatMessages.value.length > 100) {
        chatMessages.value = chatMessages.value.slice(-100)
      }
      break

    case ServerMsg.PONG:
      // Heartbeat response - connection alive
      break
  }

  // Dispatch to registered handlers
  const handlers = messageHandlers.get(type)
  if (handlers) {
    for (const handler of handlers) {
      handler(payload)
    }
  }
}

// ---- Event Registration ----

function on(type: string, handler: MessageHandler) {
  if (!messageHandlers.has(type)) {
    messageHandlers.set(type, new Set())
  }
  messageHandlers.get(type)!.add(handler)
}

function off(type: string, handler: MessageHandler) {
  messageHandlers.get(type)?.delete(handler)
}

// ---- Lobby Actions ----

function createRoom(playerName: string) {
  send(ClientMsg.CREATE_ROOM, { playerName })
}

function joinRoom(roomId: string, playerName: string) {
  send(ClientMsg.JOIN_ROOM, { roomId, playerName })
}

function leaveRoom() {
  send(ClientMsg.LEAVE_ROOM, {})
  roomState.value = null
}

function setColor(color: string) {
  send(ClientMsg.SET_COLOR, { color })
}

function setCharacter(characterIndex: number) {
  send(ClientMsg.SET_CHARACTER, { characterIndex })
}

function setReady(ready: boolean) {
  send(ClientMsg.SET_READY, { ready })
}

function startGame() {
  send(ClientMsg.START_GAME, {})
}

// ---- Game State Sync ----

/** Host broadcasts current game state to all players */
function broadcastGameState() {
  if (!isHost.value) return
  const snapshot = serializeGameState()
  send(ClientMsg.BROADCAST_STATE, { snapshot })
}

// ---- Game Actions ----

function sendGameAction(actionType: string, payload: Record<string, unknown> = {}) {
  send(actionType, payload)
}

function sendChat(message: string) {
  send(ClientMsg.CHAT, { message })
}

// ---- Composable ----

export function useWebSocket() {
  return {
    // State (readonly)
    isConnected: readonly(isConnected),
    isMultiplayer: readonly(isMultiplayer),
    playerId: readonly(playerId),
    roomState: readonly(roomState),
    chatMessages: readonly(chatMessages),
    lastError: readonly(lastError),
    isHost,
    myRoomPlayer,

    // Connection
    connect,
    disconnect,

    // Lobby
    createRoom,
    joinRoom,
    leaveRoom,
    setColor,
    setCharacter,
    setReady,
    startGame,

    // Game State Sync
    broadcastGameState,

    // Game
    sendGameAction,
    sendChat,
    send,

    // Events
    on,
    off,
  }
}
