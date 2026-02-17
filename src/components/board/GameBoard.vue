<script setup lang="ts">
import type { BoardCell, CellCoord } from '../../types/game'
import BoardCellComp from './BoardCell.vue'

const props = defineProps<{
  cells: BoardCell[][]
  highlightedCells: CellCoord[]
  isDraftMode?: boolean
  validDraftCheck?: (row: number, col: number) => boolean
  selectedCell?: CellCoord | null
}>()

const emit = defineEmits<{
  'cell-click': [row: number, col: number]
}>()

function isCellHighlighted(row: number, col: number): boolean {
  return props.highlightedCells.some((c) => c.row === row && c.col === col)
}

function isCellSelected(row: number, col: number): boolean {
  return props.selectedCell?.row === row && props.selectedCell?.col === col
}

function isValidDraft(row: number, col: number): boolean {
  if (!props.isDraftMode || !props.validDraftCheck) return false
  return props.validDraftCheck(row, col)
}
</script>

<template>
  <div class="game-board">
    <div class="board-grid">
      <template v-for="(rowCells, rowIdx) in cells" :key="rowIdx">
        <BoardCellComp
          v-for="(cell, colIdx) in rowCells"
          :key="`${rowIdx}-${colIdx}`"
          :cell="cell"
          :is-highlighted="isCellHighlighted(rowIdx, colIdx)"
          :is-selected="isCellSelected(rowIdx, colIdx)"
          :is-draft-valid="isValidDraft(rowIdx, colIdx)"
          :is-draft-mode="isDraftMode || false"
          @click="emit('cell-click', rowIdx, colIdx)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.game-board {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm);
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(8, 1fr);
  gap: var(--grid-gap);
  width: min(100%, calc(9 * 70px));
  aspect-ratio: 9 / 8;
  background: rgba(0, 229, 255, 0.02);
  border: 1px solid rgba(0, 229, 255, 0.08);
  border-radius: var(--border-radius-md);
  padding: var(--grid-gap);
}

@media (max-width: 768px) {
  .game-board {
    padding: 2px;
  }

  .board-grid {
    width: 100%;
    max-width: calc(100vw - 16px);
    max-height: 100%;
  }
}
</style>
