// ============================================================
// Neol Block - Chip Bag Utility Class
// Manages the shared chip bag (draw pile) for the game.
// This is NOT a Pinia store - it is used internally by gameStore.
// ============================================================

import type { Chip } from '../types'
import { ChipType } from '../types'
import { shuffle, generateId } from '../utils/shuffle'

export class ChipBag {
  private chips: Chip[]

  constructor() {
    this.chips = []
  }

  /**
   * Initialize the bag with data and virus chips, then shuffle.
   * @param dataCount  Number of DATA chips to create (e.g. 60)
   * @param virusCount Number of VIRUS chips to create (e.g. 12)
   */
  initialize(dataCount: number, virusCount: number): void {
    this.chips = []

    for (let i = 0; i < dataCount; i++) {
      this.chips.push({
        id: generateId('data'),
        type: ChipType.DATA,
      })
    }

    for (let i = 0; i < virusCount; i++) {
      this.chips.push({
        id: generateId('virus'),
        type: ChipType.VIRUS,
      })
    }

    this.shuffle()
  }

  /**
   * Draw up to `count` chips from the top of the bag.
   * Returns fewer chips if the bag does not contain enough.
   */
  draw(count: number): Chip[] {
    const drawn = this.chips.splice(0, Math.min(count, this.chips.length))
    return drawn
  }

  /**
   * Return chips to the bottom of the bag.
   */
  returnChips(chips: Chip[]): void {
    this.chips.push(...chips)
  }

  /**
   * Shuffle all chips currently in the bag.
   */
  shuffle(): void {
    this.chips = shuffle(this.chips)
  }

  /**
   * Check whether the bag is empty.
   */
  isEmpty(): boolean {
    return this.chips.length === 0
  }

  /**
   * Number of chips remaining in the bag.
   */
  get remaining(): number {
    return this.chips.length
  }

  /**
   * Peek at the top `count` chips without removing them.
   */
  peek(count: number): Chip[] {
    return this.chips.slice(0, Math.min(count, this.chips.length))
  }

  /**
   * Get a copy of all chips in the bag (for serialization / save state).
   */
  getAll(): Chip[] {
    return [...this.chips]
  }

  /**
   * Replace the internal chip array directly (for deserialization / store init).
   */
  setChips(chips: Chip[]): void {
    this.chips = [...chips]
  }
}
