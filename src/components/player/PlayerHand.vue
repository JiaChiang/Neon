<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Chip } from '../../types/game'
import ChipToken from '../board/ChipToken.vue'

const props = defineProps<{
  chips: Chip[]
  selectedIndex: number | null
  selectable: boolean
}>()

const emit = defineEmits<{
  select: [index: number]
}>()

const { t } = useI18n()

function handleSelect(index: number) {
  if (props.selectable) {
    emit('select', index)
  }
}
</script>

<template>
  <div class="player-hand">
    <div class="hand-label">{{ t('game.hand') }} ({{ chips.length }})</div>
    <div class="hand-chips">
      <div
        v-for="(chip, index) in chips"
        :key="chip.id"
        class="hand-chip-wrapper"
        :class="{ selected: selectedIndex === index }"
      >
        <ChipToken
          :chip="chip"
          size="md"
          :selectable="selectable"
          :selected="selectedIndex === index"
          @click="handleSelect(index)"
        />
        <span class="chip-type-label">
          {{ t(`chip.${chip.type.toLowerCase()}`) }}
        </span>
      </div>

      <div v-if="chips.length === 0" class="hand-empty">
        {{ t('market.empty') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-hand {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hand-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hand-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hand-chip-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border-radius: var(--border-radius-md);
  transition: all var(--transition-fast);
}

.hand-chip-wrapper.selected {
  background: rgba(0, 229, 255, 0.08);
  border-radius: var(--border-radius-md);
}

.chip-type-label {
  font-size: 0.6rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hand-empty {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .player-hand {
    gap: 4px;
  }

  .hand-label {
    font-size: 0.65rem;
  }

  .hand-chips {
    gap: 6px;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }

  .hand-chip-wrapper {
    padding: 4px;
    flex-shrink: 0;
  }

  .chip-type-label {
    font-size: 0.5rem;
  }
}
</style>
