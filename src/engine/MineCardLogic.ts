// ============================================================
// Neol Block - Mine Card Logic
// Handles mine card generation and effect execution.
// All functions are pure - they receive data/callbacks as params
// and return results. No Pinia store imports.
// ============================================================

import type { Chip, MineCard, BoardCell, Player } from '../types'
import { MineCardType, MineEffectTiming, StatusEffect } from '../types'
import { generateMineCardDistribution, MINE_CARD_DEFINITIONS } from '../constants'
import { shuffle, generateId } from '../utils/shuffle'

// ---- Result type returned by mine effect execution ----

export interface MineEffectResult {
  description: string
  descriptionKey: string
  chipsBounced?: { chip: Chip; fromRow: number; fromCol: number; toPlayerId: string }[]
  chipsDrawn?: Chip[]
  moneyGained?: number
  extraTurn?: boolean
  firewalled?: boolean
  statusEffectApplied?: StatusEffect
  isDelayed?: boolean
}

// ---- Context callbacks provided by the composable/view layer ----

export interface MineEffectContext {
  drawChips: (count: number) => Chip[]
  addMoney: (playerId: string, amount: number) => void
  getAdjacentOccupiedCells: (row: number, col: number) => { cell: BoardCell; chip: Chip }[]
  removeChipFromBoard: (row: number, col: number) => Chip | null
  returnChipToPlayer: (playerId: string, chip: Chip) => void
  setFirewalled: (row: number, col: number) => void
  addStatusEffect: (playerId: string, effect: StatusEffect) => void
  getPlayerToLeft: (playerId: string) => Player | undefined
  getAllPlayers: () => Player[]
  swapHands: (playerA: string, playerB: string) => void
  getCellsOwnedByPlayer: (playerId: string) => BoardCell[]
  setMirrorPathActive: (active: boolean) => void
  setStartPlayer: (playerId: string) => void
  refreshMarket: () => void
}

// ---- Mine card creation ----

/**
 * Generate mine card instances from the distribution function.
 * Creates shuffled MineCard objects ready to be placed on the board.
 */
export function createMineCards(totalCells: number): MineCard[] {
  const distribution = generateMineCardDistribution(totalCells)
  const shuffledTypes = shuffle(distribution)

  return shuffledTypes.map((type) => {
    const def = MINE_CARD_DEFINITIONS[type]
    return {
      id: generateId('mine'),
      type,
      timing: def.timing,
    }
  })
}

// ---- Immediate mine effect execution ----

/**
 * Execute an immediate mine card effect.
 * For delayed effects, returns isDelayed: true so the caller can queue them.
 */
export function executeMineEffect(
  mineType: MineCardType,
  triggerPlayerId: string,
  cellRow: number,
  cellCol: number,
  context: MineEffectContext
): MineEffectResult {
  switch (mineType) {
    // ---- No effect ----
    case MineCardType.BLANK:
      return {
        description: 'Safe! No effect.',
        descriptionKey: 'mine.effect.blank',
      }

    // ---- Positive - Immediate ----

    case MineCardType.CORE_OVERCLOCK:
      return {
        description: 'Core Overclock! Gain an extra turn.',
        descriptionKey: 'mine.effect.coreOverclock',
        extraTurn: true,
      }

    case MineCardType.FIREWALL_PATCH:
      context.setFirewalled(cellRow, cellCol)
      return {
        description: 'Firewall Patch! This cell is now protected from viruses.',
        descriptionKey: 'mine.effect.firewallPatch',
        firewalled: true,
      }

    case MineCardType.DATA_MINING: {
      const drawnChips = context.drawChips(2)
      context.addMoney(triggerPlayerId, 5)
      return {
        description: 'Data Mining! Draw 2 chips and gain $5.',
        descriptionKey: 'mine.effect.dataMining',
        chipsDrawn: drawnChips,
        moneyGained: 5,
      }
    }

    case MineCardType.UNIVERSAL_PORT: {
      const drawnChip = context.drawChips(1)
      return {
        description: 'Universal Port! Draw 1 chip and add it to your hand.',
        descriptionKey: 'mine.effect.universalPort',
        chipsDrawn: drawnChip,
      }
    }

    // ---- Negative - Immediate ----

    case MineCardType.CHAIN_SHORT_CIRCUIT: {
      const adjacentOccupied = context.getAdjacentOccupiedCells(cellRow, cellCol)
      const toBounce = adjacentOccupied.slice(0, 2)
      const chipsBounced: MineEffectResult['chipsBounced'] = []

      for (const { cell, chip } of toBounce) {
        const removed = context.removeChipFromBoard(cell.row, cell.col)
        if (removed && cell.chipPlacer) {
          context.returnChipToPlayer(cell.chipPlacer, removed)
          chipsBounced.push({
            chip: removed,
            fromRow: cell.row,
            fromCol: cell.col,
            toPlayerId: cell.chipPlacer,
          })
        }
      }

      return {
        description: `Chain Short Circuit! ${chipsBounced.length} adjacent chip(s) bounced back to owners.`,
        descriptionKey: 'mine.effect.chainShortCircuit',
        chipsBounced,
      }
    }

    case MineCardType.ASSET_FREEZE:
      context.addStatusEffect(triggerPlayerId, StatusEffect.ASSET_FREEZE)
      return {
        description: 'Asset Freeze! You cannot use the market on your next turn.',
        descriptionKey: 'mine.effect.assetFreeze',
        statusEffectApplied: StatusEffect.ASSET_FREEZE,
      }

    // ---- Delayed effects - queue for end of turn ----

    case MineCardType.CODE_SHIFT:
      return {
        description: 'Code Shift! At end of turn, you may move 2 of your chips to adjacent empty slots.',
        descriptionKey: 'mine.effect.codeShift',
        isDelayed: true,
      }

    case MineCardType.TROJAN_HORSE:
      return {
        description: 'Trojan Horse! At end of turn, swap hands with the player to your left.',
        descriptionKey: 'mine.effect.trojanHorse',
        isDelayed: true,
      }

    case MineCardType.MIRROR_PATH:
      return {
        description: 'Mirror Path! Next round, you must place chips on opponents\' slots.',
        descriptionKey: 'mine.effect.mirrorPath',
        isDelayed: true,
      }

    case MineCardType.RESTART_COMMAND:
      return {
        description: 'Restart Command! At end of turn, you become start player and the market refreshes.',
        descriptionKey: 'mine.effect.restartCommand',
        isDelayed: true,
      }

    case MineCardType.EMERGENCY_BACKUP:
      return {
        description: 'Emergency Backup! At end of turn, all players take back 1 chip from the board and gain $3.',
        descriptionKey: 'mine.effect.emergencyBackup',
        isDelayed: true,
      }

    default:
      return {
        description: 'Unknown mine card.',
        descriptionKey: 'mine.effect.unknown',
      }
  }
}

// ---- Delayed mine effect execution (at end of turn) ----

/**
 * Execute a delayed mine card effect. Called during the end-of-turn resolution phase.
 */
export function executeDelayedMineEffect(
  mineType: MineCardType,
  triggerPlayerId: string,
  context: MineEffectContext
): MineEffectResult {
  switch (mineType) {
    case MineCardType.CODE_SHIFT:
      // The actual chip movement is handled via UI interaction.
      // This function signals the requirement; the composable layer
      // will set the sub-action state to SELECT_BOARD_CHIP.
      return {
        description: 'Code Shift: Select up to 2 of your chips to move to adjacent empty slots.',
        descriptionKey: 'mine.delayed.codeShift',
      }

    case MineCardType.TROJAN_HORSE: {
      const leftPlayer = context.getPlayerToLeft(triggerPlayerId)
      if (leftPlayer) {
        context.swapHands(triggerPlayerId, leftPlayer.id)
        return {
          description: `Trojan Horse: Swapped hands with ${leftPlayer.name}.`,
          descriptionKey: 'mine.delayed.trojanHorse',
        }
      }
      return {
        description: 'Trojan Horse: No player to the left, no effect.',
        descriptionKey: 'mine.delayed.trojanHorseNoTarget',
      }
    }

    case MineCardType.MIRROR_PATH:
      context.setMirrorPathActive(true)
      return {
        description: 'Mirror Path: Next round, chips must be placed on opponents\' slots.',
        descriptionKey: 'mine.delayed.mirrorPath',
      }

    case MineCardType.RESTART_COMMAND:
      context.setStartPlayer(triggerPlayerId)
      context.refreshMarket()
      return {
        description: 'Restart Command: You are now the start player and the market has been refreshed.',
        descriptionKey: 'mine.delayed.restartCommand',
      }

    case MineCardType.EMERGENCY_BACKUP: {
      const allPlayers = context.getAllPlayers()
      for (const player of allPlayers) {
        // Each player takes back 1 chip from the board
        const ownedCells = context.getCellsOwnedByPlayer(player.id)
        const cellWithChip = ownedCells.find((c) => c.chip !== null)
        if (cellWithChip) {
          const removed = context.removeChipFromBoard(cellWithChip.row, cellWithChip.col)
          if (removed) {
            context.returnChipToPlayer(player.id, removed)
          }
        }
        // Each player gains $3
        context.addMoney(player.id, 3)
      }
      return {
        description: 'Emergency Backup: All players took back 1 chip and gained $3.',
        descriptionKey: 'mine.delayed.emergencyBackup',
        moneyGained: 3,
      }
    }

    default:
      return {
        description: 'Unknown delayed effect.',
        descriptionKey: 'mine.delayed.unknown',
      }
  }
}
