<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  GamePhase, TurnPhase, ActionType, SubActionState,
  ChipType, StatusEffect, MineCardType, MineEffectTiming, CharacterId,
} from '../types/enums'
import type { Chip, CellCoord, MineCard, BoardCell } from '../types/game'
import { DEFAULT_GAME_CONFIG, MARKET_FACE_UP_PRICES, MARKET_BLIND_PRICE, MARKET_DISCARD_PRICE } from '../constants/gameConfig'
import { getAdjacentCoords, isAdjacent } from '../utils/adjacency'
import { useGameStore } from '../stores/gameStore'
import { useBoardStore } from '../stores/boardStore'
import { useMarketStore } from '../stores/marketStore'
import { useTurnStore } from '../stores/turnStore'
import { useUIStore } from '../stores/uiStore'
import { executeMineEffect, executeDelayedMineEffect } from '../engine/MineCardLogic'
import { canUseSkill, executeSkill } from '../engine/SkillExecutor'
import { checkVictoryTrigger, checkResourceExhaustion } from '../engine/VictoryChecker'
import type { MineEffectContext } from '../engine/MineCardLogic'
import type { SkillContext } from '../engine/SkillExecutor'

import GameBoard from '../components/board/GameBoard.vue'
import PlayerHUD from '../components/player/PlayerHUD.vue'
import PlayerHand from '../components/player/PlayerHand.vue'
import MarketPanel from '../components/market/MarketPanel.vue'
import ActionPanel from '../components/actions/ActionPanel.vue'
import MineRevealModal from '../components/modals/MineRevealModal.vue'
import PassDeviceModal from '../components/modals/PassDeviceModal.vue'
import ChipToken from '../components/board/ChipToken.vue'
import NeonButton from '../components/common/NeonButton.vue'
import LanguageToggle from '../components/common/LanguageToggle.vue'
import CurrencyDisplay from '../components/common/CurrencyDisplay.vue'

const router = useRouter()
const { t } = useI18n()
const gameStore = useGameStore()
const boardStore = useBoardStore()
const marketStore = useMarketStore()
const turnStore = useTurnStore()
const uiStore = useUIStore()

// ---- Local UI state ----
const showMineModal = ref(false)
const revealedMineType = ref<MineCardType>(MineCardType.BLANK)
const showPassDevice = ref(false)
const selectedHandChip = ref<number | null>(null)
const actionMessage = ref('')
const recycleDrawnChips = ref<Chip[]>([])
const showRecycleSelect = ref(false)
const skillInteractionActive = ref(false)
const skillBoardSelectedCell = ref<CellCoord | null>(null)

// ---- Computed ----
const currentPlayer = computed(() => gameStore.players[gameStore.currentPlayerIndex])
const isFinalRound = computed(() => gameStore.gamePhase === GamePhase.FINAL_ROUND)
const highlightedCells = computed(() => uiStore.highlightedCells)

const canSkillResult = computed(() => {
  if (!currentPlayer.value) return { canUse: false, reason: 'No player' }
  return canUseSkill(currentPlayer.value, DEFAULT_GAME_CONFIG.skillCost)
})

const chipBagRemaining = computed(() => gameStore.chipBag.length)

// ---- Helper: draw function for market ----
function drawOneChip(): Chip[] {
  return gameStore.drawChips(1)
}

// ---- Mine effect context ----
function createMineContext(): MineEffectContext {
  return {
    drawChips: (count: number) => gameStore.drawChips(count),
    addMoney: (pid: string, amount: number) => gameStore.addMoney(pid, amount),
    getAdjacentOccupiedCells: (row: number, col: number) => {
      return boardStore.getAdjacentOccupiedCells(row, col).map((c) => ({
        cell: c,
        chip: c.chip!,
      }))
    },
    removeChipFromBoard: (row: number, col: number) => boardStore.removeChip(row, col),
    returnChipToPlayer: (pid: string, chip: Chip) => {
      const player = gameStore.getPlayerById(pid)
      if (player) player.hand.push(chip)
    },
    setFirewalled: (row: number, col: number) => boardStore.setFirewalled(row, col),
    addStatusEffect: (pid: string, effect: StatusEffect) => {
      const player = gameStore.getPlayerById(pid)
      if (player && !player.statusEffects.includes(effect)) {
        player.statusEffects.push(effect)
      }
    },
    getPlayerToLeft: (pid: string) => {
      const idx = gameStore.players.findIndex((p) => p.id === pid)
      if (idx < 0) return undefined
      const leftIdx = (idx - 1 + gameStore.players.length) % gameStore.players.length
      return gameStore.players[leftIdx]
    },
    getAllPlayers: () => gameStore.players,
    swapHands: (a: string, b: string) => {
      const pa = gameStore.getPlayerById(a)
      const pb = gameStore.getPlayerById(b)
      if (pa && pb) {
        const temp = [...pa.hand]
        pa.hand = [...pb.hand]
        pb.hand = temp
      }
    },
    getCellsOwnedByPlayer: (pid: string) => {
      return boardStore.getCellsOwnedBy(pid)
    },
    setMirrorPathActive: (active: boolean) => {
      gameStore.mirrorPathActive = active
    },
    setStartPlayer: (pid: string) => {
      const idx = gameStore.players.findIndex((p) => p.id === pid)
      if (idx >= 0) gameStore.startPlayerIndex = idx
    },
    refreshMarket: () => {
      marketStore.refreshMarket(drawOneChip)
    },
  }
}

// ---- Skill context ----
function createSkillContext(): SkillContext {
  return {
    drawChips: (count: number) => gameStore.drawChips(count),
    returnChipsToBag: (chips: Chip[]) => gameStore.returnChipsToBag(chips),
    addMoney: (pid: string, amount: number) => gameStore.addMoney(pid, amount),
    removeMoney: (pid: string, amount: number) => gameStore.removeMoney(pid, amount),
    getPlayer: (pid: string) => gameStore.getPlayerById(pid),
    refreshMarket: () => marketStore.refreshMarket(drawOneChip),
    getFaceUpChips: () => [...marketStore.faceUpSlots],
    takeFreeMarketChip: (index: number) => marketStore.purchaseFaceUp(index),
    setMarketDiscount: (amount: number) => turnStore.setMarketDiscount(amount),
  }
}

// ---- Turn Flow ----
onMounted(() => {
  startNewTurn()
})

function startNewTurn() {
  turnStore.startTurn()
  skillInteractionActive.value = false
  skillBoardSelectedCell.value = null
  // Clear status effects that lasted 1 turn
  if (currentPlayer.value) {
    currentPlayer.value.statusEffects = currentPlayer.value.statusEffects.filter(
      (e) => e !== StatusEffect.SKILL_BLOCKED
    )
  }
  // Show pass device screen (except first turn)
  if (gameStore.roundNumber > 1 || gameStore.currentPlayerIndex > 0) {
    showPassDevice.value = true
  } else {
    turnStore.enterSkillPhase()
  }
}

function handlePassDeviceContinue() {
  showPassDevice.value = false
  turnStore.enterSkillPhase()
}

// ---- Skill Phase ----
function handleUseSkill() {
  if (!currentPlayer.value) return
  const player = currentPlayer.value

  // Deduct cost unless free
  if (!turnStore.freeSkillAvailable) {
    gameStore.removeMoney(player.id, DEFAULT_GAME_CONFIG.skillCost)
  }
  turnStore.freeSkillAvailable = false
  turnStore.skillUsedThisTurn = true

  const result = executeSkill(
    player.character.id,
    player.isAwakened,
    player.id,
    createSkillContext()
  )

  if (result.requiresInteraction) {
    if (result.chipsDrawn) {
      // Recycler: show draw selection
      recycleDrawnChips.value = result.chipsDrawn
      showRecycleSelect.value = true
    } else if (result.interactionType) {
      // Construction Baron (or any skill needing board interaction)
      turnStore.setSubAction(result.interactionType)
      actionMessage.value = result.description
      skillInteractionActive.value = true

      // Highlight eligible cells for SELECT_BOARD_CHIP
      if (result.interactionType === SubActionState.SELECT_BOARD_CHIP && currentPlayer.value) {
        highlightSkillBoardChips()
      }
    }
  } else {
    actionMessage.value = result.description
    turnStore.enterMainAction()
  }
}

function handleRecycleSkillSelect(index: number) {
  const player = currentPlayer.value
  if (!player) return

  const kept = recycleDrawnChips.value[index]
  const returned = recycleDrawnChips.value.filter((_, i) => i !== index)

  player.hand.push(kept)
  gameStore.returnChipsToBag(returned)

  recycleDrawnChips.value = []
  showRecycleSelect.value = false
  turnStore.enterMainAction()
}

function handleSkipSkill() {
  turnStore.enterMainAction()
}

// ---- Skill Board Interaction (Construction Baron) ----

/** Highlight all of the current player's chips on the board (for SELECT_BOARD_CHIP) */
function highlightSkillBoardChips() {
  if (!currentPlayer.value) return
  const pid = currentPlayer.value.id
  const cells: CellCoord[] = []
  for (const row of boardStore.cells) {
    for (const cell of row) {
      if (cell.chip && cell.chipPlacer === pid) {
        cells.push({ row: cell.row, col: cell.col })
      }
    }
  }
  uiStore.setHighlightedCells(cells)
}

/** Handle board clicks during skill interaction */
function handleSkillBoardClick(row: number, col: number) {
  if (!currentPlayer.value) return
  const player = currentPlayer.value

  if (turnStore.subActionState === SubActionState.SELECT_BOARD_CHIP) {
    // Step 1: Select one of your chips on the board
    const cell = boardStore.getCell(row, col)
    if (!cell || !cell.chip || cell.chipPlacer !== player.id) return

    // For awakened swap: track first selected chip
    if (currentPlayer.value.isAwakened && currentPlayer.value.character.id === CharacterId.CONSTRUCTION_BARON) {
      // Awakened: swap 2 chips – no virus allowed
      if (cell.chip.type === ChipType.VIRUS) return
      skillBoardSelectedCell.value = { row, col }
      // Highlight all other own non-virus chips (for second selection)
      const swapTargets: CellCoord[] = []
      for (const r of boardStore.cells) {
        for (const c of r) {
          if (c.chip && c.chipPlacer === player.id && c.chip.type !== ChipType.VIRUS &&
            !(c.row === row && c.col === col)) {
            swapTargets.push({ row: c.row, col: c.col })
          }
        }
      }
      uiStore.setHighlightedCells(swapTargets)
      turnStore.setSubAction(SubActionState.SELECT_BOARD_CELL)
      actionMessage.value = t('skill.selectSecondChip')
      return
    }

    // Basic: move to adjacent empty slot
    skillBoardSelectedCell.value = { row, col }
    // Highlight adjacent empty cells (any player's empty slot)
    const adjacent = getAdjacentCoords(row, col, DEFAULT_GAME_CONFIG.boardRows, DEFAULT_GAME_CONFIG.boardCols)
    const emptyAdjacent = adjacent.filter((c) => {
      const adj = boardStore.getCell(c.row, c.col)
      return adj && adj.slotOwner && adj.chip === null
    })
    uiStore.setHighlightedCells(emptyAdjacent)
    turnStore.setSubAction(SubActionState.SELECT_BOARD_CELL)
    actionMessage.value = t('skill.selectTargetCell')

  } else if (turnStore.subActionState === SubActionState.SELECT_BOARD_CELL) {
    if (!skillBoardSelectedCell.value) return

    const isValid = highlightedCells.value.some((c) => c.row === row && c.col === col)
    if (!isValid) return

    const isAwakened = player.isAwakened && player.character.id === CharacterId.CONSTRUCTION_BARON

    if (isAwakened) {
      // Awakened: swap two chip positions
      const srcCell = boardStore.getCell(skillBoardSelectedCell.value.row, skillBoardSelectedCell.value.col)
      const dstCell = boardStore.getCell(row, col)
      if (!srcCell || !dstCell || !srcCell.chip || !dstCell.chip) return

      const tempChip = srcCell.chip
      const tempPlacer = srcCell.chipPlacer
      srcCell.chip = dstCell.chip
      srcCell.chipPlacer = dstCell.chipPlacer
      dstCell.chip = tempChip
      dstCell.chipPlacer = tempPlacer

      actionMessage.value = t('skill.chipSwapped')
    } else {
      // Basic: move chip from source to target
      const sourceCell = skillBoardSelectedCell.value
      const chip = boardStore.removeChip(sourceCell.row, sourceCell.col)
      if (!chip) return

      const targetCell = boardStore.getCell(row, col)
      if (targetCell) {
        targetCell.chip = chip
        targetCell.chipPlacer = player.id
      }

      actionMessage.value = t('skill.chipMoved')
    }

    // Clean up skill interaction
    skillBoardSelectedCell.value = null
    skillInteractionActive.value = false
    turnStore.setSubAction(null)
    uiStore.setHighlightedCells([])
    turnStore.enterMainAction()
  }
}

// ---- Main Action ----
function handleChooseAction(action: ActionType) {
  turnStore.setMainAction(action)

  if (action === ActionType.CHIP_INSTALL) {
    // Highlight valid cells
    if (currentPlayer.value) {
      selectedHandChip.value = null
      actionMessage.value = t('action.chipInstallDesc')
    }
  } else if (action === ActionType.CHIP_RECYCLE) {
    executeChipRecycle()
  } else if (action === ActionType.MARKET_PURCHASE) {
    actionMessage.value = t('action.marketPurchaseDesc')
  }
}

function handleHandChipSelect(index: number) {
  selectedHandChip.value = index

  if (turnStore.mainActionChosen === ActionType.CHIP_INSTALL && currentPlayer.value) {
    const chip = currentPlayer.value.hand[index]
    if (chip) {
      const validCells = boardStore.getValidPlacementCells(
        chip, currentPlayer.value.id, gameStore.mirrorPathActive
      )
      uiStore.setHighlightedCells(validCells)
    }
  }
}

// ---- Chip Install ----
function handleBoardCellClick(row: number, col: number) {
  // Route to skill interaction if active
  if (skillInteractionActive.value) {
    handleSkillBoardClick(row, col)
    return
  }

  if (turnStore.mainActionChosen !== ActionType.CHIP_INSTALL) return
  if (turnStore.currentPhase !== TurnPhase.MAIN_ACTION) return
  if (selectedHandChip.value === null) return
  if (!currentPlayer.value) return

  // Check if cell is in highlighted (valid) cells
  const isValid = highlightedCells.value.some((c) => c.row === row && c.col === col)
  if (!isValid) return

  const player = currentPlayer.value
  const chipIndex = selectedHandChip.value
  const chip = player.hand[chipIndex]
  if (!chip) return

  // Place chip on board
  boardStore.placeChip(row, col, chip, player.id)

  // Remove from hand
  player.hand.splice(chipIndex, 1)
  selectedHandChip.value = null
  uiStore.clearHighlightedCells()

  // Check if it's a completion (own slot + data chip)
  const cell = boardStore.getCell(row, col)
  if (cell && cell.slotOwner === player.id && chip.type === ChipType.DATA) {
    gameStore.completeSlot(player.id)
    // Note: completeSlot already adds the completion bonus

    // Data Collector passive check
    if (player.character.id === CharacterId.DATA_COLLECTOR && !player.isAwakened) {
      if (player.completedSlots > 0 && player.completedSlots % 4 === 0) {
        gameStore.addMoney(player.id, 6)
        actionMessage.value = '💰 進度獎勵！+$6 / Progress Reward! +$6'
      }
    }

    // Check awakening
    if (gameStore.checkAwakening(player.id)) {
      actionMessage.value = `⚡ ${t('awakening.title')} - ${t(player.character.awakenSkillKey)}`
    }

    // Check victory
    const awakenedCollectors = gameStore.players
      .filter((p) => p.character.id === CharacterId.DATA_COLLECTOR && p.isAwakened)
      .map((p) => p.id)
    const victory = checkVictoryTrigger(gameStore.players, awakenedCollectors)
    if (victory.triggered && gameStore.gamePhase !== GamePhase.FINAL_ROUND) {
      gameStore.setPhase(GamePhase.FINAL_ROUND)
      gameStore.finalRoundTriggerPlayerIndex = gameStore.currentPlayerIndex
      // Set remaining players
      gameStore.finalRoundRemainingPlayers = gameStore.players
        .filter((_, i) => i !== gameStore.currentPlayerIndex)
        .map((p) => p.id)
    }
  }

  // Virus placement on opponent's slot
  if (cell && cell.slotOwner !== player.id && chip.type === ChipType.VIRUS) {
    player.virusChipsPlaced++
  }

  // Trigger mine card
  const mine = boardStore.revealMine(row, col)
  if (mine && mine.type !== MineCardType.BLANK) {
    revealedMineType.value = mine.type
    showMineModal.value = true

    // Execute mine effect
    if (mine.timing === MineEffectTiming.IMMEDIATE) {
      const result = executeMineEffect(mine.type, player.id, row, col, createMineContext())
      // Add drawn chips to player's hand (DATA_MINING, UNIVERSAL_PORT)
      if (result.chipsDrawn && result.chipsDrawn.length > 0) {
        player.hand.push(...result.chipsDrawn)
      }
      if (result.extraTurn) {
        turnStore.addExtraTurn()
      }
      if (result.description) {
        actionMessage.value = result.description
      }
    } else if (mine.timing === MineEffectTiming.DELAYED) {
      turnStore.queueDelayedEffect(mine)
    }
  } else if (mine) {
    // Blank mine - brief flash
    revealedMineType.value = MineCardType.BLANK
    showMineModal.value = true
  } else {
    // No mine card on this cell – finish action immediately
    finishMainAction()
  }
}

// ---- Chip Recycle ----
function executeChipRecycle() {
  if (!currentPlayer.value || currentPlayer.value.hand.length === 0) return

  actionMessage.value = t('action.chipRecycleDesc')
  // Step 1: Player needs to select a chip to discard
  turnStore.setSubAction(SubActionState.SELECT_DISCARD)
}

function handleRecycleDiscard(index: number) {
  if (!currentPlayer.value) return
  const player = currentPlayer.value

  // Discard the selected chip
  const discarded = player.hand.splice(index, 1)
  gameStore.discardChips(discarded)

  // Draw 2
  const drawn = gameStore.drawChips(2)
  recycleDrawnChips.value = drawn

  // Gain $2
  gameStore.addMoney(player.id, 2)

  if (drawn.length > 0) {
    showRecycleSelect.value = true
  } else {
    // No chips to draw – finish action immediately
    turnStore.setSubAction(null)
    finishMainAction()
  }
}

function handleRecycleKeep(index: number) {
  if (!currentPlayer.value) return
  const player = currentPlayer.value

  const kept = recycleDrawnChips.value[index]
  const returned = recycleDrawnChips.value.filter((_, i) => i !== index)

  player.hand.push(kept)
  gameStore.returnChipsToBag(returned)

  recycleDrawnChips.value = []
  showRecycleSelect.value = false
  turnStore.setSubAction(null)

  finishMainAction()
}

// ---- Market Purchase ----
function handleBuyFaceUp(index: number) {
  if (!currentPlayer.value) return
  if (turnStore.marketPurchasedThisTurn) return
  const player = currentPlayer.value
  const price = Math.max(0, MARKET_FACE_UP_PRICES[index] - turnStore.marketDiscount)

  if (player.money < price) return

  const chip = marketStore.purchaseFaceUp(index)
  if (!chip) return

  gameStore.removeMoney(player.id, price)
  player.hand.push(chip)
  turnStore.marketPurchasedThisTurn = true

  // Shift and refill market
  marketStore.shiftAndRefill(drawOneChip)

  finishMainAction()
}

function handleBuyBlind() {
  if (!currentPlayer.value) return
  if (turnStore.marketPurchasedThisTurn) return
  const player = currentPlayer.value
  const price = Math.max(0, MARKET_BLIND_PRICE - turnStore.marketDiscount)

  if (player.money < price) return

  const chip = marketStore.purchaseBlind()
  if (!chip) return

  gameStore.removeMoney(player.id, price)
  player.hand.push(chip)
  turnStore.marketPurchasedThisTurn = true

  // Refill blind
  const newBlind = gameStore.drawChips(1)
  if (newBlind.length > 0) {
    marketStore.blindSlot = newBlind[0]
  }

  finishMainAction()
}

// ---- Finish Action & End Turn ----
function finishMainAction() {
  // Resolve delayed mine effects
  for (const mine of turnStore.delayedMineEffects) {
    executeDelayedMineEffect(mine.type, currentPlayer.value!.id, createMineContext())
  }
  turnStore.delayedMineEffects = []

  // Check resource exhaustion
  if (checkResourceExhaustion(gameStore.chipBag.length, gameStore.discardPile.length, boardStore.cells)) {
    gameStore.setPhase(GamePhase.GAME_OVER)
    router.push('/victory')
    return
  }

  turnStore.enterEndResolution()
}

function handleEndTurn() {
  // Clear turn-specific modifiers
  if (currentPlayer.value) {
    // Remove asset freeze after it triggers
    currentPlayer.value.statusEffects = currentPlayer.value.statusEffects.filter(
      (e) => e !== StatusEffect.ASSET_FREEZE
    )
  }

  // Check for extra turns
  if (turnStore.extraTurnsPending > 0) {
    turnStore.extraTurnsPending--
    startNewTurn()
    return
  }

  // Final round check
  if (gameStore.gamePhase === GamePhase.FINAL_ROUND) {
    // Remove current player from remaining list
    const pid = currentPlayer.value?.id
    if (pid) {
      gameStore.finalRoundRemainingPlayers = gameStore.finalRoundRemainingPlayers.filter(
        (id) => id !== pid
      )
    }

    if (gameStore.finalRoundRemainingPlayers.length === 0) {
      // Game over
      gameStore.setPhase(GamePhase.GAME_OVER)
      router.push('/victory')
      return
    }
  }

  // Advance to next player
  gameStore.nextPlayer()

  // Disable mirror path after one round
  // (Check if we've come back to start player)
  if (gameStore.mirrorPathActive && gameStore.currentPlayerIndex === gameStore.startPlayerIndex) {
    gameStore.mirrorPathActive = false
  }

  startNewTurn()
}

function handleMineModalClose() {
  showMineModal.value = false

  // If we just installed a chip and no further sub-action, finish
  if (turnStore.mainActionChosen === ActionType.CHIP_INSTALL) {
    finishMainAction()
  }
}

function handleRemoveVirus() {
  // TODO: Implement virus removal flow
  actionMessage.value = 'Select a virus chip on the board to remove'
}
</script>

<template>
  <div class="gameplay-view">
    <!-- Top Bar -->
    <div class="top-bar">
      <div class="top-left">
        <span class="round-badge">{{ t('game.round', { n: gameStore.roundNumber }) }}</span>
        <span v-if="isFinalRound" class="final-round-badge animate-neon-pulse">
          ⚠️ {{ t('game.finalRound') }}
        </span>
      </div>
      <div class="top-center">
        <span class="turn-label" v-if="currentPlayer">
          {{ t('game.currentTurn', { name: currentPlayer.name }) }}
        </span>
        <span class="phase-label">
          {{ t(`game.phase.${turnStore.currentPhase === TurnPhase.SKILL_PHASE ? 'skill' :
            turnStore.currentPhase === TurnPhase.MAIN_ACTION ? 'mainAction' : 'endResolution'}`) }}
        </span>
      </div>
      <div class="top-right">
        <span class="bag-info">
          {{ t('game.chipBag') }}: {{ chipBagRemaining }} {{ t('game.remaining') }}
        </span>
        <LanguageToggle />
      </div>
    </div>

    <!-- Main Layout -->
    <div class="main-layout">
      <!-- Left: Player List -->
      <div class="left-sidebar">
        <PlayerHUD
          v-for="(player, index) in gameStore.players"
          :key="player.id"
          :player="player"
          :is-active="index === gameStore.currentPlayerIndex"
        />
      </div>

      <!-- Center: Board -->
      <div class="center-board">
        <GameBoard
          :cells="boardStore.cells"
          :highlighted-cells="highlightedCells"
          :selected-cell="turnStore.selectedCell"
          @cell-click="handleBoardCellClick"
        />
      </div>

      <!-- Right: Market -->
      <div class="right-sidebar">
        <MarketPanel
          :face-up-slots="marketStore.faceUpSlots"
          :blind-slot="marketStore.blindSlot"
          :discard-pile-count="gameStore.discardPile.length"
          :player-money="currentPlayer?.money || 0"
          :is-active="turnStore.mainActionChosen === ActionType.MARKET_PURCHASE && turnStore.currentPhase === TurnPhase.MAIN_ACTION"
          :market-discount="turnStore.marketDiscount"
          @buy-face-up="handleBuyFaceUp"
          @buy-blind="handleBuyBlind"
        />
      </div>
    </div>

    <!-- Bottom Bar: Current Player Controls -->
    <div class="bottom-bar" v-if="currentPlayer">
      <div class="bottom-left">
        <PlayerHand
          :chips="currentPlayer.hand"
          :selected-index="selectedHandChip"
          :selectable="(turnStore.mainActionChosen === ActionType.CHIP_INSTALL && turnStore.currentPhase === TurnPhase.MAIN_ACTION) ||
            turnStore.subActionState === SubActionState.SELECT_DISCARD"
          @select="turnStore.subActionState === SubActionState.SELECT_DISCARD
            ? handleRecycleDiscard($event)
            : handleHandChipSelect($event)"
        />
      </div>

      <div class="bottom-center">
        <div v-if="actionMessage" class="action-message">{{ actionMessage }}</div>
        <ActionPanel
          :current-phase="turnStore.currentPhase"
          :player="currentPlayer"
          :skill-cost="DEFAULT_GAME_CONFIG.skillCost"
          :free-skill-available="turnStore.freeSkillAvailable"
          :skill-used-this-turn="turnStore.skillUsedThisTurn"
          :can-use-skill-result="canSkillResult"
          :main-action-chosen="turnStore.mainActionChosen"
          :has-chips-in-hand="currentPlayer.hand.length > 0"
          @use-skill="handleUseSkill"
          @skip-skill="handleSkipSkill"
          @choose-action="handleChooseAction"
          @end-turn="handleEndTurn"
          @remove-virus="handleRemoveVirus"
        />
      </div>

      <div class="bottom-right">
        <CurrencyDisplay :amount="currentPlayer.money" size="lg" />
        <div class="slots-progress">
          {{ t('game.completed') }}: {{ currentPlayer.completedSlots }}/{{ currentPlayer.totalSlots }}
        </div>
      </div>
    </div>

    <!-- End Turn Overlay -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="turnStore.currentPhase === TurnPhase.END_RESOLUTION && !showMineModal && !showRecycleSelect"
          class="end-turn-overlay"
        >
          <div class="end-turn-popup">
            <div class="end-turn-message">{{ actionMessage || t('action.turnComplete') }}</div>
            <NeonButton size="lg" @click="handleEndTurn">
              {{ t('action.endTurn') }} →
            </NeonButton>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Recycle Select Modal -->
    <Teleport to="body">
      <div v-if="showRecycleSelect" class="modal-overlay">
        <div class="recycle-modal">
          <h3 class="modal-title">
            {{ turnStore.skillUsedThisTurn ? '選擇保留 / Select to Keep' : '選擇保留 1 片 / Keep 1 Chip' }}
          </h3>
          <div class="recycle-chips">
            <div
              v-for="(chip, index) in recycleDrawnChips"
              :key="chip.id"
              class="recycle-chip-option"
              @click="turnStore.skillUsedThisTurn ? handleRecycleSkillSelect(index) : handleRecycleKeep(index)"
            >
              <ChipToken :chip="chip" size="lg" :selectable="true" />
              <span class="chip-label">{{ t(`chip.${chip.type.toLowerCase()}`) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Mine Reveal Modal -->
    <MineRevealModal
      :mine-type="revealedMineType"
      :visible="showMineModal"
      @close="handleMineModalClose"
    />

    <!-- Pass Device Modal -->
    <PassDeviceModal
      v-if="currentPlayer"
      :next-player="currentPlayer"
      :visible="showPassDevice"
      @continue="handlePassDeviceContinue"
    />
  </div>
</template>

<style scoped>
.gameplay-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-deepest);
  overflow: hidden;
}

/* ---- Top Bar ---- */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px var(--space-md);
  background: var(--bg-surface);
  border-bottom: 1px solid rgba(0, 229, 255, 0.08);
  flex-shrink: 0;
}

.top-left, .top-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.top-center {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.round-badge {
  font-family: var(--font-display);
  font-size: 0.75rem;
  color: var(--neon-cyan);
  letter-spacing: 2px;
}

.final-round-badge {
  font-family: var(--font-display);
  font-size: 0.75rem;
  color: var(--neon-red);
  padding: 2px 10px;
  border: 1px solid var(--neon-red);
  border-radius: 12px;
}

.turn-label {
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 600;
}

.phase-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.bag-info {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* ---- Main Layout ---- */
.main-layout {
  flex: 1;
  display: flex;
  min-height: 0;
  gap: var(--space-sm);
  padding: var(--space-sm);
}

.left-sidebar {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex-shrink: 0;
}

.center-board {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.right-sidebar {
  width: 250px;
  overflow-y: auto;
  flex-shrink: 0;
}

/* ---- Bottom Bar ---- */
.bottom-bar {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border-top: 1px solid rgba(0, 229, 255, 0.08);
  flex-shrink: 0;
  max-height: 180px;
}

.bottom-left {
  flex: 1;
  min-width: 0;
}

.bottom-center {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.bottom-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm);
}

.action-message {
  font-size: 0.8rem;
  color: var(--neon-cyan);
  padding: 4px 10px;
  background: rgba(0, 229, 255, 0.05);
  border-radius: var(--border-radius-sm);
  border-left: 2px solid var(--neon-cyan);
}

.slots-progress {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* ---- Recycle Modal ---- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
  backdrop-filter: blur(4px);
}

.recycle-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-xl);
  background: var(--bg-surface);
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: var(--border-radius-xl);
  animation: scale-pop 0.3s ease;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--neon-cyan);
  letter-spacing: 2px;
}

.recycle-chips {
  display: flex;
  gap: var(--space-lg);
}

.recycle-chip-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: var(--space-md);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.recycle-chip-option:hover {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.2);
  transform: translateY(-4px);
}

.chip-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

/* ---- End Turn Overlay ---- */
.end-turn-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
  backdrop-filter: blur(2px);
}

.end-turn-popup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-xl) calc(var(--space-xl) * 2);
  background: var(--bg-surface);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: var(--border-radius-xl);
  animation: scale-pop 0.3s ease;
}

.end-turn-message {
  font-family: var(--font-ui);
  font-size: 1rem;
  color: var(--text-secondary);
  text-align: center;
  max-width: 300px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
