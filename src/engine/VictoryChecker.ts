// ============================================================
// Neol Block - Victory Checker
// Handles victory condition detection, resource exhaustion
// checks, and final ranking calculations.
// All functions are pure - no Pinia store imports.
// ============================================================

import type { Player, BoardCell, PlayerRanking } from '../types'

// ---- Victory trigger check ----

/**
 * Check if any player has reached the victory trigger condition.
 * A player triggers the final round by completing the required number
 * of slots (6 normally, or 5 for an awakened Data Collector).
 *
 * @param players                All players in the game
 * @param awakenedDataCollectorIds  IDs of players with awakened Data Collector (win at 5 slots)
 * @returns Whether the trigger condition is met, and who triggered it
 */
export function checkVictoryTrigger(
  players: Player[],
  awakenedDataCollectorIds: string[]
): { triggered: boolean; triggerPlayerId: string | null; requiredSlots: number } {
  for (const player of players) {
    const isAwakenedCollector = awakenedDataCollectorIds.includes(player.id)
    const requiredSlots = isAwakenedCollector ? 5 : 6

    if (player.completedSlots >= requiredSlots) {
      return {
        triggered: true,
        triggerPlayerId: player.id,
        requiredSlots,
      }
    }
  }

  return {
    triggered: false,
    triggerPlayerId: null,
    requiredSlots: 6,
  }
}

// ---- Resource exhaustion check ----

/**
 * Check if the game should end due to resource exhaustion.
 * This happens when:
 * - The chip bag is empty AND the discard pile is empty, OR
 * - The board is completely full (every cell has a chip)
 *
 * @param chipBagRemaining  Number of chips remaining in the bag
 * @param discardPileSize   Number of chips in the discard pile
 * @param boardCells        The board grid (2D array of BoardCell)
 * @returns Whether resource exhaustion has occurred
 */
export function checkResourceExhaustion(
  chipBagRemaining: number,
  discardPileSize: number,
  boardCells: BoardCell[][]
): boolean {
  // Check chip supply exhaustion
  const chipsExhausted = chipBagRemaining === 0 && discardPileSize === 0

  if (chipsExhausted) {
    return true
  }

  // Check board full
  const boardFull = boardCells.every((row) =>
    row.every((cell) => cell.chip !== null)
  )

  return boardFull
}

// ---- Final rankings calculation ----

/**
 * Calculate final rankings for all players at game end.
 * Sort order:
 *   1. completedSlots DESC (most completed slots first)
 *   2. money DESC (tiebreaker: most money)
 *   3. hand.length DESC (tiebreaker: most chips in hand)
 *
 * Players with identical stats share the same rank number.
 *
 * @param players  All players in the game
 * @returns Sorted array of PlayerRanking with assigned rank numbers
 */
export function calculateFinalRankings(players: Player[]): PlayerRanking[] {
  // Build ranking entries
  const entries: PlayerRanking[] = players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    playerColor: p.color,
    completedSlots: p.completedSlots,
    money: p.money,
    handSize: p.hand.length,
    rank: 0, // Will be assigned below
  }))

  // Sort by completedSlots DESC, then money DESC, then handSize DESC
  entries.sort((a, b) => {
    if (b.completedSlots !== a.completedSlots) {
      return b.completedSlots - a.completedSlots
    }
    if (b.money !== a.money) {
      return b.money - a.money
    }
    return b.handSize - a.handSize
  })

  // Assign rank numbers, handling ties
  if (entries.length > 0) {
    entries[0].rank = 1

    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1]
      const curr = entries[i]

      if (
        curr.completedSlots === prev.completedSlots &&
        curr.money === prev.money &&
        curr.handSize === prev.handSize
      ) {
        // Tied: same rank as previous
        curr.rank = prev.rank
      } else {
        // Not tied: rank = position (1-indexed)
        curr.rank = i + 1
      }
    }
  }

  return entries
}
