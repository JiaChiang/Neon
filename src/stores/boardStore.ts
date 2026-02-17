// ============================================================
// Neol Block - Board Store (Grid State)
// ============================================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BoardCell, Chip, CellCoord, MineCard, DraftState } from '../types'
import { ChipType, MineCardType, MineEffectTiming, PlayerColor } from '../types'
import { DRAFT_SLOTS_PER_TURN, MINE_CARD_DEFINITIONS } from '../constants'
import { getAdjacentCoords } from '../utils/adjacency'
import { generateId } from '../utils/shuffle'

export const useBoardStore = defineStore('board', () => {
  // ---- State ----
  const cells = ref<BoardCell[][]>([])
  const draftState = ref<DraftState>({
    currentRound: 0,
    currentPlayerIndex: 0,
    slotsPlacedThisRound: 0,
    slotsPerTurn: DRAFT_SLOTS_PER_TURN,
    isReversed: false,
    isComplete: false,
  })

  // ---- Actions ----

  function initializeBoard(rows: number, cols: number) {
    const grid: BoardCell[][] = []
    for (let r = 0; r < rows; r++) {
      const row: BoardCell[] = []
      for (let c = 0; c < cols; c++) {
        row.push({
          row: r,
          col: c,
          slotOwner: null,
          slotColor: null,
          chip: null,
          chipPlacer: null,
          mineCard: null,
          mineRevealed: false,
          isFirewalled: false,
          isFaceDown: false,
        })
      }
      grid.push(row)
    }
    cells.value = grid
  }

  function placeSlot(
    row: number,
    col: number,
    playerId: string,
    color: PlayerColor
  ) {
    const cell = cells.value[row]?.[col]
    if (cell) {
      cell.slotOwner = playerId
      cell.slotColor = color
    }
  }

  function placeChip(
    row: number,
    col: number,
    chip: Chip,
    placerId: string
  ) {
    const cell = cells.value[row]?.[col]
    if (!cell) return

    // DATA chips can only be placed on cells owned by the placer
    if (chip.type === ChipType.DATA && cell.slotOwner !== placerId) return
    // VIRUS chips can only be placed on cells NOT owned by the placer
    if (chip.type === ChipType.VIRUS && cell.slotOwner === placerId) return

    cell.chip = chip
    cell.chipPlacer = placerId
  }

  function removeChip(row: number, col: number): Chip | null {
    const cell = cells.value[row]?.[col]
    if (!cell || !cell.chip) return null
    const removed = cell.chip
    cell.chip = null
    cell.chipPlacer = null
    return removed
  }

  function getCell(row: number, col: number): BoardCell | undefined {
    return cells.value[row]?.[col]
  }

  function getCellsOwnedBy(playerId: string): BoardCell[] {
    const result: BoardCell[] = []
    for (const row of cells.value) {
      for (const cell of row) {
        if (cell.slotOwner === playerId) {
          result.push(cell)
        }
      }
    }
    return result
  }

  function getCompletedCellsBy(playerId: string): BoardCell[] {
    const result: BoardCell[] = []
    for (const row of cells.value) {
      for (const cell of row) {
        if (
          cell.slotOwner === playerId &&
          cell.chip !== null &&
          cell.chip.type === ChipType.DATA
        ) {
          result.push(cell)
        }
      }
    }
    return result
  }

  function getEmptySlotsOf(playerId: string): BoardCell[] {
    const result: BoardCell[] = []
    for (const row of cells.value) {
      for (const cell of row) {
        if (cell.slotOwner === playerId && cell.chip === null) {
          result.push(cell)
        }
      }
    }
    return result
  }

  function getValidPlacementCells(
    chip: Chip,
    playerId: string,
    mirrorPathActive: boolean
  ): CellCoord[] {
    const result: CellCoord[] = []

    for (const row of cells.value) {
      for (const cell of row) {
        // Cell must have a slot owner and no chip already placed
        if (!cell.slotOwner || cell.chip !== null) continue

        if (mirrorPathActive) {
          // Mirror Path: DATA chips go on opponent slots, VIRUS on own slots (inverted)
          if (chip.type === ChipType.DATA && cell.slotOwner !== playerId) {
            result.push({ row: cell.row, col: cell.col })
          } else if (chip.type === ChipType.VIRUS && cell.slotOwner === playerId) {
            result.push({ row: cell.row, col: cell.col })
          }
        } else {
          // Normal rules: DATA on own empty slots, VIRUS on opponent empty slots (not firewalled)
          if (chip.type === ChipType.DATA && cell.slotOwner === playerId) {
            result.push({ row: cell.row, col: cell.col })
          } else if (
            chip.type === ChipType.VIRUS &&
            cell.slotOwner !== playerId &&
            !cell.isFirewalled
          ) {
            result.push({ row: cell.row, col: cell.col })
          }
        }
      }
    }

    return result
  }

  function getAdjacentOccupiedCells(row: number, col: number): BoardCell[] {
    const maxRows = cells.value.length
    const maxCols = cells.value[0]?.length ?? 0
    const adjacent = getAdjacentCoords(row, col, maxRows, maxCols)

    return adjacent
      .map((coord) => cells.value[coord.row]?.[coord.col])
      .filter((cell): cell is BoardCell => cell !== undefined && cell.chip !== null)
  }

  function setMineCard(row: number, col: number, mine: MineCard) {
    const cell = cells.value[row]?.[col]
    if (cell) {
      cell.mineCard = mine
      cell.mineRevealed = false
    }
  }

  function revealMine(row: number, col: number): MineCard | null {
    const cell = cells.value[row]?.[col]
    if (!cell || !cell.mineCard || cell.mineRevealed) return null
    cell.mineRevealed = true
    return cell.mineCard
  }

  function setFirewalled(row: number, col: number) {
    const cell = cells.value[row]?.[col]
    if (cell) {
      cell.isFirewalled = true
    }
  }

  function hasAdjacentSlot(row: number, col: number): boolean {
    const maxRows = cells.value.length
    const maxCols = cells.value[0]?.length ?? 0
    const adjacent = getAdjacentCoords(row, col, maxRows, maxCols)
    return adjacent.some((coord) => {
      const cell = cells.value[coord.row]?.[coord.col]
      return cell !== undefined && cell.slotOwner !== null
    })
  }

  function assignMineCards(mineTypes: MineCardType[]) {
    // Assign mine cards to all cells that have a slot owner
    let typeIndex = 0
    for (const row of cells.value) {
      for (const cell of row) {
        if (cell.slotOwner !== null && typeIndex < mineTypes.length) {
          const mineType = mineTypes[typeIndex]
          const definition = MINE_CARD_DEFINITIONS[mineType]
          const timing = definition ? definition.timing : MineEffectTiming.NONE

          cell.mineCard = {
            id: generateId('mine'),
            type: mineType,
            timing,
          }
          cell.mineRevealed = false
          typeIndex++
        }
      }
    }
  }

  // ---- Draft Actions ----

  function initDraft(playerCount: number) {
    draftState.value = {
      currentRound: 1,
      currentPlayerIndex: 0,
      slotsPlacedThisRound: 0,
      slotsPerTurn: DRAFT_SLOTS_PER_TURN,
      isReversed: false,
      isComplete: false,
    }
  }

  function advanceDraft(playerCount?: number) {
    const draft = draftState.value
    draft.slotsPlacedThisRound++

    // Check if current player has placed all their slots for this turn
    if (draft.slotsPlacedThisRound >= draft.slotsPerTurn) {
      draft.slotsPlacedThisRound = 0

      const maxIndex = (playerCount ?? 2) - 1

      // Move to next player in snake order
      if (draft.isReversed) {
        if (draft.currentPlayerIndex <= 0) {
          // End of reverse round, start new forward round
          draft.currentRound++
          draft.isReversed = false
          // Stay at index 0 for next forward round
        } else {
          draft.currentPlayerIndex--
        }
      } else {
        if (draft.currentPlayerIndex >= maxIndex) {
          // End of forward round, start new reverse round
          draft.currentRound++
          draft.isReversed = true
          // Stay at last index for next reverse round
        } else {
          draft.currentPlayerIndex++
        }
      }
    }
  }

  function isDraftComplete(): boolean {
    return draftState.value.isComplete
  }

  function getCurrentDraftPlayer(): number {
    return draftState.value.currentPlayerIndex
  }

  function getDraftOrder(playerCount: number): number[] {
    const draft = draftState.value
    const order: number[] = []

    if (draft.isReversed) {
      // Reverse: last player to first
      for (let i = playerCount - 1; i >= 0; i--) {
        order.push(i)
      }
    } else {
      // Forward: first player to last
      for (let i = 0; i < playerCount; i++) {
        order.push(i)
      }
    }

    return order
  }

  return {
    // State
    cells,
    draftState,
    // Actions
    initializeBoard,
    placeSlot,
    placeChip,
    removeChip,
    getCell,
    getCellsOwnedBy,
    getCompletedCellsBy,
    getEmptySlotsOf,
    getValidPlacementCells,
    getAdjacentOccupiedCells,
    setMineCard,
    revealMine,
    setFirewalled,
    hasAdjacentSlot,
    assignMineCards,
    // Draft actions
    initDraft,
    advanceDraft,
    isDraftComplete,
    getCurrentDraftPlayer,
    getDraftOrder,
  }
})
