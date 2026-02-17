<script setup lang="ts">
import { computed } from 'vue'
import type { BoardCell } from '../../types/game'
import { ChipType, PlayerColor } from '../../types/enums'
import { PLAYER_COLORS_CSS } from '../../constants/gameConfig'
import ChipToken from './ChipToken.vue'

const props = defineProps<{
  cell: BoardCell
  isHighlighted: boolean
  isSelected: boolean
  isDraftValid: boolean
  isDraftMode: boolean
}>()

defineEmits<{
  click: []
}>()

const slotColor = computed(() => {
  if (!props.cell.slotOwner || !props.cell.slotColor) return 'transparent'
  return PLAYER_COLORS_CSS[props.cell.slotColor] || 'transparent'
})

const hasChip = computed(() => props.cell.chip !== null)
const isCompleted = computed(() => {
  return hasChip.value &&
    props.cell.chip?.type === ChipType.DATA &&
    props.cell.chipPlacer === props.cell.slotOwner
})
const hasVirus = computed(() => props.cell.chip?.type === ChipType.VIRUS)

const cellClasses = computed(() => ({
  'cell--owned': !!props.cell.slotOwner,
  'cell--highlighted': props.isHighlighted,
  'cell--selected': props.isSelected,
  'cell--draft-valid': props.isDraftValid && props.isDraftMode,
  'cell--completed': isCompleted.value,
  'cell--virus': hasVirus.value,
  'cell--firewalled': props.cell.isFirewalled,
  'cell--empty': !props.cell.slotOwner,
}))
</script>

<template>
  <div
    class="board-cell"
    :class="cellClasses"
    :style="{ '--slot-color': slotColor }"
    @click="$emit('click')"
  >
    <!-- Slot background -->
    <div v-if="cell.slotOwner" class="cell-slot-bg" />

    <!-- Chip -->
    <ChipToken v-if="cell.chip" :chip="cell.chip" :size="'sm'" />

    <!-- Mine indicator (unrevealed) -->
    <div
      v-if="cell.mineCard && !cell.mineRevealed && !isDraftMode"
      class="mine-indicator"
    />

    <!-- Firewall indicator -->
    <div v-if="cell.isFirewalled" class="firewall-badge">🛡️</div>

    <!-- Completed check -->
    <div v-if="isCompleted" class="completed-check">✓</div>

    <!-- Draft valid indicator -->
    <div v-if="isDraftValid && isDraftMode && !cell.slotOwner" class="draft-valid-dot" />
  </div>
</template>

<style scoped>
.board-cell {
  position: relative;
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 3px;
  background: var(--bg-dark);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.board-cell:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

/* ---- Owned Slot (colorful) ---- */
.cell--owned {
  border-color: color-mix(in srgb, var(--slot-color) 50%, transparent);
  background: color-mix(in srgb, var(--slot-color) 12%, var(--bg-dark));
}

.cell-slot-bg {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--slot-color) 18%, transparent),
    color-mix(in srgb, var(--slot-color) 5%, transparent)
  );
}

/* ---- Completed ---- */
.cell--completed {
  border-color: color-mix(in srgb, var(--slot-color) 60%, transparent);
  box-shadow: inset 0 0 8px color-mix(in srgb, var(--slot-color) 15%, transparent);
}

.completed-check {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 0.55rem;
  color: var(--neon-green);
  text-shadow: 0 0 4px var(--neon-green);
  z-index: 2;
}

/* ---- Virus ---- */
.cell--virus {
  border-color: rgba(255, 45, 85, 0.4);
  animation: virus-pulse 2s ease-in-out infinite;
}

/* ---- Firewalled ---- */
.firewall-badge {
  position: absolute;
  bottom: 1px;
  right: 2px;
  font-size: 0.5rem;
  z-index: 2;
}

/* ---- Highlighted (valid placement target) ---- */
.cell--highlighted {
  border-color: var(--neon-cyan);
  animation: cell-highlight 1.5s ease-in-out infinite;
  cursor: pointer;
}

/* ---- Selected ---- */
.cell--selected {
  border-color: var(--neon-cyan);
  box-shadow:
    0 0 8px var(--neon-cyan),
    inset 0 0 8px rgba(0, 229, 255, 0.15);
}

/* ---- Empty (no owner) ---- */
.cell--empty {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.02);
}

/* ---- Draft Valid ---- */
.cell--draft-valid {
  border-color: rgba(0, 229, 255, 0.3);
  cursor: pointer;
}

.cell--draft-valid:hover {
  border-color: var(--neon-cyan);
  box-shadow: inset 0 0 8px rgba(0, 229, 255, 0.1);
}

.draft-valid-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--neon-cyan);
  opacity: 0.4;
  animation: neon-pulse 2s ease-in-out infinite;
}

/* ---- Mine Indicator ---- */
.mine-indicator {
  position: absolute;
  bottom: 2px;
  left: 2px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--neon-orange);
  opacity: 0.3;
}
</style>
