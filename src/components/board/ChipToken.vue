<script setup lang="ts">
import { computed } from 'vue'
import type { Chip } from '../../types/game'
import { ChipType } from '../../types/enums'

const props = defineProps<{
  chip: Chip
  size?: 'xs' | 'sm' | 'md' | 'lg'
  selectable?: boolean
  selected?: boolean
  faceDown?: boolean
}>()

defineEmits<{
  click: []
}>()

const chipClasses = computed(() => ({
  [`chip--${props.chip.type.toLowerCase()}`]: true,
  [`chip--${props.size || 'md'}`]: true,
  'chip--selectable': props.selectable,
  'chip--selected': props.selected,
  'chip--face-down': props.faceDown,
}))

const chipLabel = computed(() => {
  if (props.faceDown) return '?'
  switch (props.chip.type) {
    case ChipType.DATA: return 'D'
    case ChipType.VIRUS: return 'V'
    default: return '?'
  }
})
</script>

<template>
  <div class="chip-token" :class="chipClasses" @click="$emit('click')">
    <span class="chip-label">{{ chipLabel }}</span>
  </div>
</template>

<style scoped>
.chip-token {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-family: var(--font-display);
  font-weight: 700;
  transition: all var(--transition-fast);
  z-index: 1;
}

/* ---- Sizes ---- */
.chip--xs {
  width: 18px;
  height: 18px;
  font-size: 0.5rem;
}

.chip--sm {
  width: 28px;
  height: 28px;
  font-size: 0.65rem;
}

.chip--md {
  width: 40px;
  height: 40px;
  font-size: 0.85rem;
}

.chip--lg {
  width: 52px;
  height: 52px;
  font-size: 1rem;
}

/* ---- Data Chip (White) ---- */
.chip--data {
  background: linear-gradient(135deg, #ffffff, #e8e8e8);
  color: #222;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    0 0 6px rgba(255, 255, 255, 0.5),
    inset 0 1px 3px rgba(255, 255, 255, 0.6);
}

/* ---- Virus Chip (Black) ---- */
.chip--virus {
  background: linear-gradient(135deg, #1a1a1a, #000000);
  color: #ff4444;
  border: 2px solid #444;
  box-shadow:
    0 0 4px rgba(0, 0, 0, 0.8),
    inset 0 1px 2px rgba(60, 60, 60, 0.3);
}

.chip--virus .chip-label {
  text-shadow: 0 0 6px rgba(255, 68, 68, 0.6);
}

/* ---- Face Down ---- */
.chip--face-down {
  background: linear-gradient(135deg, var(--bg-elevated), var(--bg-dark));
  color: var(--text-secondary);
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

/* ---- Selectable ---- */
.chip--selectable {
  cursor: pointer;
}

.chip--selectable:hover {
  transform: scale(1.15);
  box-shadow:
    0 0 8px var(--neon-cyan),
    0 0 16px var(--neon-cyan);
}

/* ---- Selected ---- */
.chip--selected {
  transform: scale(1.15);
  border-color: var(--neon-cyan) !important;
  box-shadow:
    0 0 8px var(--neon-cyan),
    0 0 16px var(--neon-cyan) !important;
}

.chip-label {
  user-select: none;
}
</style>
