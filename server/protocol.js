/**
 * WebSocket Protocol - Message types for Neol Block multiplayer
 *
 * All messages follow the format: { type: string, payload: object }
 */

// ---- Client → Server ----
export const ClientMsg = {
  // Lobby
  CREATE_ROOM: 'create_room',       // { playerName }
  JOIN_ROOM: 'join_room',           // { roomId, playerName }
  LEAVE_ROOM: 'leave_room',        // {}
  SET_COLOR: 'set_color',          // { color }
  SET_CHARACTER: 'set_character',  // { characterIndex }
  SET_READY: 'set_ready',          // { ready: boolean }
  START_GAME: 'start_game',        // {} (host only)

  // Draft
  DRAFT_PLACE: 'draft_place',      // { row, col }
  DRAFT_AUTO: 'draft_auto',        // {} (host only)

  // Game Actions
  USE_SKILL: 'use_skill',          // {}
  SKIP_SKILL: 'skip_skill',       // {}
  CHOOSE_ACTION: 'choose_action',  // { action: ActionType }
  SELECT_HAND_CHIP: 'select_hand_chip', // { chipIndex }
  CLICK_BOARD_CELL: 'click_board_cell', // { row, col }
  BUY_FACE_UP: 'buy_face_up',     // { slotIndex }
  BUY_BLIND: 'buy_blind',         // {}
  RECYCLE_DISCARD: 'recycle_discard', // { chipIndex }
  RECYCLE_KEEP: 'recycle_keep',    // { chipIndex }
  SKILL_BOARD_CLICK: 'skill_board_click', // { row, col }
  END_TURN: 'end_turn',           // {}
  MINE_MODAL_CLOSE: 'mine_modal_close', // {}

  // State sync (Host → Server → All clients)
  BROADCAST_STATE: 'broadcast_state', // { snapshot }

  // Chat
  CHAT: 'chat',                    // { message }

  // Heartbeat
  PING: 'ping',                    // {}
}

// ---- Server → Client ----
export const ServerMsg = {
  // Connection
  CONNECTED: 'connected',          // { playerId }
  ERROR: 'error',                  // { message }

  // Lobby
  ROOM_CREATED: 'room_created',    // { roomId }
  ROOM_STATE: 'room_state',       // { room: RoomState }
  PLAYER_JOINED: 'player_joined',  // { player }
  PLAYER_LEFT: 'player_left',      // { playerId }
  PLAYER_UPDATED: 'player_updated', // { playerId, changes }

  // Game State Sync
  GAME_STATE: 'game_state',        // Full game state (personalized per player)
  GAME_ACTION: 'game_action',      // { action, result } - incremental update
  TURN_CHANGED: 'turn_changed',    // { currentPlayerIndex, phase }

  // Events
  MINE_REVEALED: 'mine_revealed',  // { row, col, mineType }
  CHIP_PLACED: 'chip_placed',      // { row, col, chip, placerId }
  MARKET_UPDATED: 'market_updated', // { faceUpSlots, blindSlotExists }
  PLAYER_AWAKENED: 'player_awakened', // { playerId }
  VICTORY: 'victory',              // { rankings }

  // Chat
  CHAT: 'chat',                    // { playerId, playerName, message }

  // Heartbeat
  PONG: 'pong',                    // {}
}
