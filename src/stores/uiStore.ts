// ============================================================
// Neol Block - UI Store
// ============================================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CellCoord } from '../types'
import { ModalType } from '../types'

export const useUIStore = defineStore('ui', () => {
  // ---- State ----
  const language = ref<'zh-TW' | 'en'>('zh-TW')
  const activeModal = ref<ModalType | null>(null)
  const modalData = ref<Record<string, unknown>>({})
  const highlightedCells = ref<CellCoord[]>([])
  const selectedHandChipIndex = ref<number | null>(null)
  const showRules = ref(false)
  const animationInProgress = ref(false)
  const gameMessage = ref('')
  const gameMessageType = ref<'info' | 'success' | 'warning' | 'error'>('info')

  // ---- Actions ----

  function toggleLanguage() {
    language.value = language.value === 'zh-TW' ? 'en' : 'zh-TW'
  }

  function openModal(type: ModalType, data?: Record<string, unknown>) {
    activeModal.value = type
    modalData.value = data ?? {}
  }

  function closeModal() {
    activeModal.value = null
    modalData.value = {}
  }

  function setHighlightedCells(cells: CellCoord[]) {
    highlightedCells.value = cells
  }

  function clearHighlightedCells() {
    highlightedCells.value = []
  }

  function setSelectedChip(index: number | null) {
    selectedHandChipIndex.value = index
  }

  function setAnimating(v: boolean) {
    animationInProgress.value = v
  }

  function showMessage(msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    gameMessage.value = msg
    gameMessageType.value = type
  }

  function clearMessage() {
    gameMessage.value = ''
    gameMessageType.value = 'info'
  }

  return {
    // State
    language,
    activeModal,
    modalData,
    highlightedCells,
    selectedHandChipIndex,
    showRules,
    animationInProgress,
    gameMessage,
    gameMessageType,
    // Actions
    toggleLanguage,
    openModal,
    closeModal,
    setHighlightedCells,
    clearHighlightedCells,
    setSelectedChip,
    setAnimating,
    showMessage,
    clearMessage,
  }
})
