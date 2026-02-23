/**
 * WebSocket Protocol - Message types for Neol Block multiplayer
 * Shared between client and server
 */

// ---- Client → Server ----
export const ClientMsg = {
  // Lobby
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SET_COLOR: 'set_color',
  SET_CHARACTER: 'set_character',
  SET_READY: 'set_ready',
  START_GAME: 'start_game',

  // Draft
  DRAFT_PLACE: 'draft_place',
  DRAFT_AUTO: 'draft_auto',

  // Game Actions
  USE_SKILL: 'use_skill',
  SKIP_SKILL: 'skip_skill',
  CHOOSE_ACTION: 'choose_action',
  SELECT_HAND_CHIP: 'select_hand_chip',
  CLICK_BOARD_CELL: 'click_board_cell',
  BUY_FACE_UP: 'buy_face_up',
  BUY_BLIND: 'buy_blind',
  RECYCLE_DISCARD: 'recycle_discard',
  RECYCLE_KEEP: 'recycle_keep',
  SKILL_BOARD_CLICK: 'skill_board_click',
  END_TURN: 'end_turn',
  MINE_MODAL_CLOSE: 'mine_modal_close',

  // State sync (Host → Server → All clients)
  BROADCAST_STATE: 'broadcast_state',

  // Chat
  CHAT: 'chat',

  // Heartbeat
  PING: 'ping',
} as const

// ---- Server → Client ----
export const ServerMsg = {
  // Connection
  CONNECTED: 'connected',
  ERROR: 'error',

  // Lobby
  ROOM_CREATED: 'room_created',
  ROOM_STATE: 'room_state',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_UPDATED: 'player_updated',

  // Game State Sync
  GAME_STATE: 'game_state',
  GAME_ACTION: 'game_action',
  TURN_CHANGED: 'turn_changed',

  // Events
  MINE_REVEALED: 'mine_revealed',
  CHIP_PLACED: 'chip_placed',
  MARKET_UPDATED: 'market_updated',
  PLAYER_AWAKENED: 'player_awakened',
  VICTORY: 'victory',

  // Chat
  CHAT: 'chat',

  // Heartbeat
  PONG: 'pong',
} as const

// ---- Types ----
export interface RoomPlayer {
  id: string
  name: string
  color: string
  characterIndex: number | null
  ready: boolean
  isHost: boolean
  connected: boolean
}

export interface RoomState {
  id: string
  hostId: string
  status: 'lobby' | 'playing'
  players: RoomPlayer[]
}

export interface ChatMessage {
  playerId: string
  playerName: string
  message: string
  timestamp: number
}

export interface WSMessage {
  type: string
  payload: Record<string, unknown>
}
