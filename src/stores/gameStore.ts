// ============================================================
// Neol Block - Game Store (Master Game State)
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Chip, Player, GameConfig, GameLogEntry } from '../types'
import { GamePhase, ChipType, MineCardType } from '../types'
import { DEFAULT_GAME_CONFIG } from '../constants'
import { shuffle, generateId } from '../utils/shuffle'

export const useGameStore = defineStore('game', () => {
  // ---- State ----
  const gamePhase = ref<GamePhase>(GamePhase.MENU)
  const roundNumber = ref(1)
  const startPlayerIndex = ref(0)
  const currentPlayerIndex = ref(0)
  const playerCount = ref(0)
  const players = ref<Player[]>([])
  const chipBag = ref<Chip[]>([])
  const discardPile = ref<Chip[]>([])
  const gameConfig = ref<GameConfig>({ ...DEFAULT_GAME_CONFIG })
  const gameLog = ref<GameLogEntry[]>([])
  const finalRoundTriggerPlayerIndex = ref<number | null>(null)
  const finalRoundRemainingPlayers = ref<string[]>([])
  const mirrorPathActive = ref(false)
  const mineTypes = ref<MineCardType[]>([])

  // ---- Computed ----
  const currentPlayer = computed<Player | undefined>(() => {
    return players.value[currentPlayerIndex.value]
  })

  // ---- Actions ----

  function initializeGame(params: {
    config: GameConfig
    players: Player[]
    chipBag: Chip[]
    mineTypes: MineCardType[]
  }) {
    gameConfig.value = { ...params.config }
    playerCount.value = params.config.playerCount
    gamePhase.value = GamePhase.SETUP
    roundNumber.value = 1
    startPlayerIndex.value = 0
    currentPlayerIndex.value = 0
    finalRoundTriggerPlayerIndex.value = null
    finalRoundRemainingPlayers.value = []
    mirrorPathActive.value = false
    gameLog.value = []
    discardPile.value = []

    players.value = params.players
    chipBag.value = params.chipBag
    mineTypes.value = params.mineTypes
  }

  function drawChips(count: number): Chip[] {
    const drawn: Chip[] = []
    for (let i = 0; i < count; i++) {
      if (chipBag.value.length === 0) break
      drawn.push(chipBag.value.shift()!)
    }
    return drawn
  }

  function discardChips(chips: Chip[]) {
    discardPile.value.push(...chips)
  }

  function addToLog(entry: GameLogEntry) {
    gameLog.value.push(entry)
  }

  function nextPlayer() {
    currentPlayerIndex.value =
      (currentPlayerIndex.value + 1) % playerCount.value
    if (currentPlayerIndex.value === startPlayerIndex.value) {
      roundNumber.value++
    }
  }

  function setPhase(phase: GamePhase) {
    gamePhase.value = phase
  }

  function addMoney(playerId: string, amount: number) {
    const player = players.value.find((p) => p.id === playerId)
    if (player) {
      player.money += amount
    }
  }

  function removeMoney(playerId: string, amount: number) {
    const player = players.value.find((p) => p.id === playerId)
    if (player) {
      player.money = Math.max(0, player.money - amount)
    }
  }

  function returnChipsToBag(chips: Chip[]) {
    chipBag.value.push(...chips)
    chipBag.value = shuffle(chipBag.value)
  }

  function completeSlot(playerId: string) {
    const player = players.value.find((p) => p.id === playerId)
    if (player) {
      player.completedSlots++
      player.completedSlotsData++
      player.money += gameConfig.value.completionBonus
    }
  }

  function checkAwakening(playerId: string): boolean {
    const player = players.value.find((p) => p.id === playerId)
    if (!player) return false
    if (player.isAwakened) return false
    if (player.completedSlots >= gameConfig.value.awakenSlotCount) {
      player.isAwakened = true
      return true
    }
    return false
  }

  function getPlayerById(id: string): Player | undefined {
    return players.value.find((p) => p.id === id)
  }

  return {
    gamePhase,
    roundNumber,
    startPlayerIndex,
    currentPlayerIndex,
    playerCount,
    players,
    chipBag,
    discardPile,
    gameConfig,
    gameLog,
    finalRoundTriggerPlayerIndex,
    finalRoundRemainingPlayers,
    mirrorPathActive,
    mineTypes,
    currentPlayer,
    initializeGame,
    drawChips,
    discardChips,
    addToLog,
    nextPlayer,
    setPhase,
    addMoney,
    removeMoney,
    returnChipsToBag,
    completeSlot,
    checkAwakening,
    getPlayerById,
  }
})
