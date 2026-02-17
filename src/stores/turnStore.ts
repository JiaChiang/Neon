// ============================================================
// Neol Block - Turn Store (Turn Phase Management)
// ============================================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Chip, CellCoord, MineCard } from '../types'
import { TurnPhase, ActionType, SubActionState } from '../types'

export const useTurnStore = defineStore('turn', () => {
  // ---- State ----
  const currentPhase = ref<TurnPhase>(TurnPhase.TURN_START)
  const skillUsedThisTurn = ref(false)
  const freeSkillAvailable = ref(false)
  const mainActionChosen = ref<ActionType | null>(null)
  const subActionState = ref<SubActionState | null>(null)
  const extraTurnsPending = ref(0)
  const delayedMineEffects = ref<MineCard[]>([])
  const selectedChipIndex = ref<number | null>(null)
  const selectedCell = ref<CellCoord | null>(null)
  const drawnChips = ref<Chip[]>([])
  const marketDiscount = ref(0)
  const marketPurchasedThisTurn = ref(false)

  // ---- Actions ----

  function startTurn() {
    currentPhase.value = TurnPhase.TURN_START
    skillUsedThisTurn.value = false
    mainActionChosen.value = null
    subActionState.value = null
    selectedChipIndex.value = null
    selectedCell.value = null
    drawnChips.value = []
    marketDiscount.value = 0
    marketPurchasedThisTurn.value = false
    // Note: freeSkillAvailable, extraTurnsPending, and delayedMineEffects
    // persist across turns and are managed externally
  }

  function enterSkillPhase() {
    currentPhase.value = TurnPhase.SKILL_PHASE
  }

  function enterMainAction() {
    currentPhase.value = TurnPhase.MAIN_ACTION
  }

  function enterEndResolution() {
    currentPhase.value = TurnPhase.END_RESOLUTION
  }

  function setMainAction(action: ActionType) {
    mainActionChosen.value = action
  }

  function setSubAction(state: SubActionState | null) {
    subActionState.value = state
  }

  function addExtraTurn() {
    extraTurnsPending.value++
  }

  function queueDelayedEffect(mine: MineCard) {
    delayedMineEffects.value.push(mine)
  }

  function clearTurnState() {
    currentPhase.value = TurnPhase.TURN_END
    skillUsedThisTurn.value = false
    freeSkillAvailable.value = false
    mainActionChosen.value = null
    subActionState.value = null
    extraTurnsPending.value = 0
    delayedMineEffects.value = []
    selectedChipIndex.value = null
    selectedCell.value = null
    drawnChips.value = []
    marketDiscount.value = 0
  }

  function setSelectedChip(index: number | null) {
    selectedChipIndex.value = index
  }

  function setSelectedCell(coord: CellCoord | null) {
    selectedCell.value = coord
  }

  function setDrawnChips(chips: Chip[]) {
    drawnChips.value = chips
  }

  function setFreeSkill(available: boolean) {
    freeSkillAvailable.value = available
  }

  function setMarketDiscount(amount: number) {
    marketDiscount.value = amount
  }

  return {
    // State
    currentPhase,
    skillUsedThisTurn,
    freeSkillAvailable,
    mainActionChosen,
    subActionState,
    extraTurnsPending,
    delayedMineEffects,
    selectedChipIndex,
    selectedCell,
    drawnChips,
    marketDiscount,
    marketPurchasedThisTurn,
    // Actions
    startTurn,
    enterSkillPhase,
    enterMainAction,
    enterEndResolution,
    setMainAction,
    setSubAction,
    addExtraTurn,
    queueDelayedEffect,
    clearTurnState,
    setSelectedChip,
    setSelectedCell,
    setDrawnChips,
    setFreeSkill,
    setMarketDiscount,
  }
})
