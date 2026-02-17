// ============================================================
// Neol Block - Market Store
// ============================================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Chip } from '../types'
import {
  MARKET_FACE_UP_PRICES,
  MARKET_BLIND_PRICE,
  MARKET_DISCARD_PRICE,
  MARKET_FACE_UP_COUNT,
} from '../constants'

export const useMarketStore = defineStore('market', () => {
  // ---- State ----
  const faceUpSlots = ref<(Chip | null)[]>(
    Array.from({ length: MARKET_FACE_UP_COUNT }, () => null)
  )
  const blindSlot = ref<Chip | null>(null)

  // ---- Actions ----

  function initializeMarket(drawFn: () => Chip[]) {
    // Fill all face-up slots
    for (let i = 0; i < MARKET_FACE_UP_COUNT; i++) {
      const drawn = drawFn()
      faceUpSlots.value[i] = drawn.length > 0 ? drawn[0] : null
    }

    // Fill blind slot
    const blindDrawn = drawFn()
    blindSlot.value = blindDrawn.length > 0 ? blindDrawn[0] : null
  }

  function purchaseFaceUp(index: number): Chip | null {
    if (index < 0 || index >= MARKET_FACE_UP_COUNT) return null
    const chip = faceUpSlots.value[index]
    if (!chip) return null
    faceUpSlots.value[index] = null
    return chip
  }

  function purchaseBlind(): Chip | null {
    const chip = blindSlot.value
    if (!chip) return null
    blindSlot.value = null
    return chip
  }

  function shiftAndRefill(drawFn: () => Chip[]) {
    // Shift chips toward slot 0, filling gaps
    const existing: (Chip | null)[] = []
    for (let i = 0; i < MARKET_FACE_UP_COUNT; i++) {
      if (faceUpSlots.value[i] !== null) {
        existing.push(faceUpSlots.value[i])
      }
    }

    // Place existing chips starting from slot 0
    for (let i = 0; i < MARKET_FACE_UP_COUNT; i++) {
      if (i < existing.length) {
        faceUpSlots.value[i] = existing[i]
      } else {
        // Draw new chip for empty slot
        const drawn = drawFn()
        faceUpSlots.value[i] = drawn.length > 0 ? drawn[0] : null
      }
    }

    // Refill blind slot if empty
    if (blindSlot.value === null) {
      const blindDrawn = drawFn()
      blindSlot.value = blindDrawn.length > 0 ? blindDrawn[0] : null
    }
  }

  function refreshMarket(drawFn: () => Chip[]) {
    // Replace all slots with new draws
    for (let i = 0; i < MARKET_FACE_UP_COUNT; i++) {
      const drawn = drawFn()
      faceUpSlots.value[i] = drawn.length > 0 ? drawn[0] : null
    }
    const blindDrawn = drawFn()
    blindSlot.value = blindDrawn.length > 0 ? blindDrawn[0] : null
  }

  function getAvailableSlots(): { index: number; chip: Chip }[] {
    const available: { index: number; chip: Chip }[] = []
    for (let i = 0; i < MARKET_FACE_UP_COUNT; i++) {
      const chip = faceUpSlots.value[i]
      if (chip !== null) {
        available.push({ index: i, chip })
      }
    }
    return available
  }

  function getFaceUpPrice(index: number): number {
    if (index < 0 || index >= MARKET_FACE_UP_PRICES.length) return 0
    return MARKET_FACE_UP_PRICES[index]
  }

  function addToDiscardDisplay(chips: Chip[]) {
    // The discard pile is managed by gameStore.
    // This method is a no-op placeholder for market-side coordination.
    // Chips are added to gameStore.discardPile directly.
  }

  return {
    // State
    faceUpSlots,
    blindSlot,
    // Actions
    initializeMarket,
    purchaseFaceUp,
    purchaseBlind,
    shiftAndRefill,
    refreshMarket,
    getAvailableSlots,
    getFaceUpPrice,
    addToDiscardDisplay,
  }
})
