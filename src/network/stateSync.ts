// ============================================================
// Neol Block - State Serialization/Deserialization
// Serialize Pinia stores to JSON snapshots for WebSocket sync
// ============================================================

import { useGameStore } from '../stores/gameStore'
import { useBoardStore } from '../stores/boardStore'
import { useMarketStore } from '../stores/marketStore'
import { useTurnStore } from '../stores/turnStore'
import type { GameConfig, Player, Chip, MineCard, BoardCell, DraftState, GameLogEntry } from '../types'
import { GamePhase, TurnPhase, ActionType, SubActionState, MineCardType } from '../types'

// ---- Snapshot Types ----

export interface GameSnapshot {
  game: {
    gamePhase: string
    roundNumber: number
    startPlayerIndex: number
    currentPlayerIndex: number
    playerCount: number
    players: Player[]
    chipBag: Chip[]
    discardPile: Chip[]
    gameConfig: GameConfig
    mineTypes: string[]
    mirrorPathActive: boolean
    finalRoundTriggerPlayerIndex: number | null
    finalRoundRemainingPlayers: string[]
  }
  board: {
    cells: BoardCell[][]
    draftState: DraftState
  }
  market: {
    faceUpSlots: (Chip | null)[]
    blindSlot: Chip | null
  }
  turn: {
    currentPhase: string
    skillUsedThisTurn: boolean
    freeSkillAvailable: boolean
    mainActionChosen: string | null
    subActionState: string | null
    extraTurnsPending: number
    delayedMineEffects: MineCard[]
    marketDiscount: number
    marketPurchasedThisTurn: boolean
  }
}

// ---- Serialize ----

export function serializeGameState(): GameSnapshot {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const marketStore = useMarketStore()
  const turnStore = useTurnStore()

  return {
    game: {
      gamePhase: gameStore.gamePhase,
      roundNumber: gameStore.roundNumber,
      startPlayerIndex: gameStore.startPlayerIndex,
      currentPlayerIndex: gameStore.currentPlayerIndex,
      playerCount: gameStore.playerCount,
      players: JSON.parse(JSON.stringify(gameStore.players)),
      chipBag: JSON.parse(JSON.stringify(gameStore.chipBag)),
      discardPile: JSON.parse(JSON.stringify(gameStore.discardPile)),
      gameConfig: JSON.parse(JSON.stringify(gameStore.gameConfig)),
      mineTypes: [...gameStore.mineTypes],
      mirrorPathActive: gameStore.mirrorPathActive,
      finalRoundTriggerPlayerIndex: gameStore.finalRoundTriggerPlayerIndex,
      finalRoundRemainingPlayers: [...gameStore.finalRoundRemainingPlayers],
    },
    board: {
      cells: JSON.parse(JSON.stringify(boardStore.cells)),
      draftState: JSON.parse(JSON.stringify(boardStore.draftState)),
    },
    market: {
      faceUpSlots: JSON.parse(JSON.stringify(marketStore.faceUpSlots)),
      blindSlot: marketStore.blindSlot ? JSON.parse(JSON.stringify(marketStore.blindSlot)) : null,
    },
    turn: {
      currentPhase: turnStore.currentPhase,
      skillUsedThisTurn: turnStore.skillUsedThisTurn,
      freeSkillAvailable: turnStore.freeSkillAvailable,
      mainActionChosen: turnStore.mainActionChosen,
      subActionState: turnStore.subActionState,
      extraTurnsPending: turnStore.extraTurnsPending,
      delayedMineEffects: JSON.parse(JSON.stringify(turnStore.delayedMineEffects)),
      marketDiscount: turnStore.marketDiscount,
      marketPurchasedThisTurn: turnStore.marketPurchasedThisTurn,
    },
  }
}

// ---- Deserialize ----

export function deserializeGameState(snapshot: GameSnapshot): void {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const marketStore = useMarketStore()
  const turnStore = useTurnStore()

  // Game store
  gameStore.gamePhase = snapshot.game.gamePhase as GamePhase
  gameStore.roundNumber = snapshot.game.roundNumber
  gameStore.startPlayerIndex = snapshot.game.startPlayerIndex
  gameStore.currentPlayerIndex = snapshot.game.currentPlayerIndex
  gameStore.playerCount = snapshot.game.playerCount
  gameStore.players = snapshot.game.players
  gameStore.chipBag = snapshot.game.chipBag
  gameStore.discardPile = snapshot.game.discardPile
  gameStore.gameConfig = snapshot.game.gameConfig
  gameStore.mineTypes = snapshot.game.mineTypes as MineCardType[]
  gameStore.mirrorPathActive = snapshot.game.mirrorPathActive
  gameStore.finalRoundTriggerPlayerIndex = snapshot.game.finalRoundTriggerPlayerIndex
  gameStore.finalRoundRemainingPlayers = snapshot.game.finalRoundRemainingPlayers

  // Board store
  boardStore.cells = snapshot.board.cells
  boardStore.draftState = snapshot.board.draftState

  // Market store
  marketStore.faceUpSlots = snapshot.market.faceUpSlots
  marketStore.blindSlot = snapshot.market.blindSlot

  // Turn store
  turnStore.currentPhase = snapshot.turn.currentPhase as TurnPhase
  turnStore.skillUsedThisTurn = snapshot.turn.skillUsedThisTurn
  turnStore.freeSkillAvailable = snapshot.turn.freeSkillAvailable
  turnStore.mainActionChosen = snapshot.turn.mainActionChosen as ActionType | null
  turnStore.subActionState = snapshot.turn.subActionState as SubActionState | null
  turnStore.extraTurnsPending = snapshot.turn.extraTurnsPending
  turnStore.delayedMineEffects = snapshot.turn.delayedMineEffects
  turnStore.marketDiscount = snapshot.turn.marketDiscount
  turnStore.marketPurchasedThisTurn = snapshot.turn.marketPurchasedThisTurn
}
