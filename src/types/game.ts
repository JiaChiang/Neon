// ============================================================
// Neol Block - Core Game Types
// ============================================================

import type {
  ChipType,
  PlayerColor,
  MineCardType,
  MineEffectTiming,
  CharacterId,
  StatusEffect,
  GamePhase,
  TurnPhase,
  ActionType,
  SubActionState,
  ModalType,
} from './enums'

// ---- Chips ----
export interface Chip {
  id: string
  type: ChipType
}

// ---- Board ----
export interface CellCoord {
  row: number
  col: number
}

export interface BoardCell {
  row: number
  col: number
  slotOwner: string | null       // Player ID who owns this slot
  slotColor: PlayerColor | null
  chip: Chip | null              // Chip placed on this cell
  chipPlacer: string | null      // Player ID who placed the chip
  mineCard: MineCard | null      // Face-down mine card
  mineRevealed: boolean
  isFirewalled: boolean          // From "Firewall Patch" - no virus allowed
  isFaceDown: boolean            // Corporate Spy hidden placement
}

// ---- Mine Cards ----
export interface MineCard {
  id: string
  type: MineCardType
  timing: MineEffectTiming
}

// ---- Characters ----
export interface Character {
  id: CharacterId
  nameKey: string         // i18n key for name
  titleKey: string        // i18n key for title/role
  basicSkillKey: string   // i18n key for basic skill name
  basicDescKey: string    // i18n key for basic skill description
  awakenSkillKey: string  // i18n key for awakened skill name
  awakenDescKey: string   // i18n key for awakened skill description
  color: string           // Theme color for character card glow
}

// ---- Players ----
export interface Player {
  id: string
  name: string
  color: PlayerColor
  character: Character
  isAwakened: boolean
  money: number
  hand: Chip[]
  completedSlots: number
  totalSlots: number          // Usually 10
  statusEffects: StatusEffect[]
  // Tracking stats
  virusChipsPlaced: number
  positiveMinesTriggered: number
  completedSlotsData: number  // Track for missions
}

// ---- Market ----
export interface MarketState {
  faceUpSlots: (Chip | null)[]  // 3 positions
  faceUpPrices: number[]         // [3, 3, 4]
  blindSlot: Chip | null
  blindPrice: number             // 2
  discardPilePrice: number       // 6
}

// ---- Turn State ----
export interface TurnState {
  currentPhase: TurnPhase
  skillUsedThisTurn: boolean
  freeSkillAvailable: boolean
  mainActionChosen: ActionType | null
  subActionState: SubActionState | null
  extraTurnsPending: number
  delayedMineEffects: MineCard[]
  // Temporary data during sub-actions
  selectedChipIndex: number | null
  selectedCell: CellCoord | null
  drawnChips: Chip[]  // For recycle action - show the 2 drawn chips
}

// ---- UI State ----
export interface UIState {
  language: 'zh-TW' | 'en'
  activeModal: ModalType | null
  modalData: Record<string, unknown>
  highlightedCells: CellCoord[]
  selectedHandChipIndex: number | null
  showRules: boolean
  animationInProgress: boolean
}

// ---- Game Config ----
export interface GameConfig {
  playerCount: number
  boardRows: number
  boardCols: number
  slotsPerPlayer: number
  startingMoney: number
  startingHandSize: number
  dataChipCount: number
  virusChipCount: number
  skillCost: number
  virusRemovalCost: number   // chips needed to remove virus
  completionBonus: number    // $1 for placing on own slot
  winSlotCount: number       // 6 to trigger final round
  awakenSlotCount: number    // 4 to awaken
}

// ---- Game Log ----
export interface GameLogEntry {
  turn: number
  playerId: string
  action: string
  details: Record<string, unknown>
  timestamp: number
}

// ---- Draft ----
export interface DraftState {
  currentRound: number
  currentPlayerIndex: number
  slotsPlacedThisRound: number
  slotsPerTurn: number         // 2 slots per turn
  isReversed: boolean          // Snake direction
  isComplete: boolean
}

// ---- Victory ----
export interface VictoryResult {
  rankings: PlayerRanking[]
  triggerType: 'slots' | 'exhaustion'
  triggerPlayerId: string | null
}

export interface PlayerRanking {
  playerId: string
  playerName: string
  playerColor: PlayerColor
  completedSlots: number
  money: number
  handSize: number
  rank: number
}
