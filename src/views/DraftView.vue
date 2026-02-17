<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { GamePhase } from '../types/enums'
import { PLAYER_COLORS_CSS, DRAFT_SLOTS_PER_TURN } from '../constants/gameConfig'
import { useGameStore } from '../stores/gameStore'
import { useBoardStore } from '../stores/boardStore'
import { shuffle } from '../utils/shuffle'
import NeonButton from '../components/common/NeonButton.vue'
import GameBoard from '../components/board/GameBoard.vue'

const router = useRouter()
const { t } = useI18n()
const gameStore = useGameStore()
const boardStore = useBoardStore()

// ---- Computed ----
const currentDraftPlayerIndex = computed(() => boardStore.draftState.currentPlayerIndex)
const currentPlayer = computed(() => gameStore.players[currentDraftPlayerIndex.value])
const slotsPlacedThisRound = computed(() => boardStore.draftState.slotsPlacedThisRound)
const slotsRemaining = computed(() => {
  if (!currentPlayer.value) return 0
  const placed = boardStore.getCellsOwnedBy(currentPlayer.value.id).length
  return currentPlayer.value.totalSlots - placed
})
const isDraftComplete = computed(() => boardStore.draftState.isComplete)
const currentRound = computed(() => boardStore.draftState.currentRound)

// ---- Methods ----
function handleCellClick(row: number, col: number) {
  if (isDraftComplete.value) return
  if (!currentPlayer.value) return

  const cell = boardStore.getCell(row, col)
  if (!cell || cell.slotOwner) return

  // Check adjacency rule (skip for very first placement)
  const totalPlaced = boardStore.cells.flat().filter(c => c.slotOwner !== null).length
  if (totalPlaced > 0 && !boardStore.hasAdjacentSlot(row, col)) return

  // Place the slot
  boardStore.placeSlot(row, col, currentPlayer.value.id, currentPlayer.value.color)

  // advanceDraft increments slotsPlacedThisRound and handles player switching
  boardStore.advanceDraft(gameStore.playerCount)

  // Check if all players have placed all slots
  const allDone = gameStore.players.every(
    (p) => boardStore.getCellsOwnedBy(p.id).length >= p.totalSlots
  )
  if (allDone) {
    boardStore.draftState.isComplete = true
    finalizeDraft()
  }
}

function finalizeDraft() {
  // Assign mine cards to all cells that have slot owners
  boardStore.assignMineCards(gameStore.mineTypes)
}

function startPlaying() {
  gameStore.setPhase(GamePhase.PLAYING)
  router.push('/play')
}

function isValidDraftCell(row: number, col: number): boolean {
  if (isDraftComplete.value) return false
  const cell = boardStore.getCell(row, col)
  if (!cell || cell.slotOwner) return false
  const totalPlaced = boardStore.cells.flat().filter(c => c.slotOwner !== null).length
  if (totalPlaced === 0) return true
  return boardStore.hasAdjacentSlot(row, col)
}

function autoRandomDraft() {
  // Reset board
  const rows = boardStore.cells.length
  const cols = boardStore.cells[0]?.length ?? 0
  boardStore.initializeBoard(rows, cols)
  boardStore.initDraft(gameStore.playerCount)

  // Build snake draft order: [0,1,...,n-1, n-1,...,1,0, 0,1,...] until all slots placed
  const totalSlotsPerPlayer = gameStore.players[0]?.totalSlots ?? 10
  const pCount = gameStore.playerCount
  const totalSlots = totalSlotsPerPlayer * pCount
  const draftOrder: number[] = []
  let forward = true
  while (draftOrder.length < totalSlots) {
    if (forward) {
      for (let i = 0; i < pCount && draftOrder.length < totalSlots; i++) {
        for (let s = 0; s < DRAFT_SLOTS_PER_TURN && draftOrder.length < totalSlots; s++) {
          draftOrder.push(i)
        }
      }
    } else {
      for (let i = pCount - 1; i >= 0 && draftOrder.length < totalSlots; i--) {
        for (let s = 0; s < DRAFT_SLOTS_PER_TURN && draftOrder.length < totalSlots; s++) {
          draftOrder.push(i)
        }
      }
    }
    forward = !forward
  }

  // For each player turn, find valid cells and pick randomly
  for (const playerIdx of draftOrder) {
    const player = gameStore.players[playerIdx]
    if (!player) continue

    // Check if player already has all slots
    if (boardStore.getCellsOwnedBy(player.id).length >= player.totalSlots) continue

    // Collect valid cells
    const validCells: { row: number; col: number }[] = []
    const totalPlaced = boardStore.cells.flat().filter(c => c.slotOwner !== null).length

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = boardStore.getCell(r, c)
        if (!cell || cell.slotOwner) continue
        if (totalPlaced === 0 || boardStore.hasAdjacentSlot(r, c)) {
          validCells.push({ row: r, col: c })
        }
      }
    }

    if (validCells.length === 0) continue

    // Pick a random valid cell
    const shuffled = shuffle(validCells)
    const chosen = shuffled[0]
    boardStore.placeSlot(chosen.row, chosen.col, player.id, player.color)
  }

  // Mark draft complete and assign mines
  boardStore.draftState.isComplete = true
  finalizeDraft()
}
</script>

<template>
  <div class="draft-view">
    <!-- Header -->
    <div class="draft-header">
      <div class="draft-info">
        <h1 class="draft-title neon-text">{{ t('draft.title') }}</h1>
        <span class="draft-subtitle">{{ t('draft.subtitle') }}</span>
      </div>

      <div v-if="!isDraftComplete" class="draft-status">
        <div class="draft-player" v-if="currentPlayer">
          <span
            class="player-dot"
            :style="{ background: PLAYER_COLORS_CSS[currentPlayer.color] }"
          />
          <span class="player-name">
            {{ t('draft.playerTurn', { name: currentPlayer.name }) }}
          </span>
        </div>
        <div class="draft-meta">
          <span>{{ t('draft.round', { n: currentRound + 1 }) }}</span>
          <span>{{ t('draft.slotsRemaining', { n: slotsRemaining }) }}</span>
        </div>
        <NeonButton variant="secondary" size="sm" @click="autoRandomDraft">
          🎲 {{ t('draft.autoRandom') }}
        </NeonButton>
      </div>

      <div v-else class="draft-complete">
        <span class="complete-text neon-text-green">✓ {{ t('draft.complete') }}</span>
        <NeonButton @click="startPlaying">
          {{ t('draft.startPlay') }} →
        </NeonButton>
      </div>
    </div>

    <!-- Board -->
    <div class="draft-board-container">
      <GameBoard
        :cells="boardStore.cells"
        :highlighted-cells="[]"
        :is-draft-mode="true"
        :valid-draft-check="isValidDraftCell"
        @cell-click="handleCellClick"
      />
    </div>

    <!-- Player List -->
    <div class="draft-players">
      <div
        v-for="(player, index) in gameStore.players"
        :key="player.id"
        class="draft-player-tag"
        :class="{ active: index === currentDraftPlayerIndex && !isDraftComplete }"
        :style="{ '--player-color': PLAYER_COLORS_CSS[player.color] }"
      >
        <span class="player-dot" :style="{ background: PLAYER_COLORS_CSS[player.color] }" />
        <span>{{ player.name }}</span>
        <span class="slot-count">
          {{ boardStore.getCellsOwnedBy(player.id).length }}/{{ player.totalSlots }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.draft-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--space-md);
  gap: var(--space-md);
  background:
    radial-gradient(ellipse at 50% 50%, rgba(0, 229, 255, 0.03) 0%, transparent 60%),
    var(--bg-deepest);
}

.draft-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.draft-info {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
}

.draft-title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  letter-spacing: 3px;
}

.draft-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.draft-status {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.draft-player {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-ui);
  font-size: 1.1rem;
  font-weight: 600;
}

.player-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
}

.draft-meta {
  display: flex;
  gap: var(--space-md);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.draft-complete {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.complete-text {
  font-family: var(--font-display);
  font-size: 1.1rem;
  letter-spacing: 2px;
}

/* ---- Board Container ---- */
.draft-board-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

/* ---- Player Tags ---- */
.draft-players {
  display: flex;
  justify-content: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.draft-player-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  transition: all var(--transition-normal);
}

.draft-player-tag.active {
  border-color: var(--player-color);
  color: var(--text-primary);
  box-shadow: 0 0 8px color-mix(in srgb, var(--player-color) 30%, transparent);
}

.slot-count {
  opacity: 0.5;
  font-family: var(--font-display);
  font-size: 0.7rem;
}
</style>
