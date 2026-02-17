<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Player } from '../../types/game'
import { PLAYER_COLORS_CSS } from '../../constants/gameConfig'

const props = defineProps<{
  nextPlayer: Player
  visible: boolean
}>()

const emit = defineEmits<{
  continue: []
}>()

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="pass-overlay" @click="emit('continue')">
        <div class="pass-content">
          <div class="pass-text">{{ t('game.passDevice') }}</div>
          <div
            class="pass-player-name"
            :style="{ color: PLAYER_COLORS_CSS[nextPlayer.color] }"
          >
            {{ nextPlayer.name }}
          </div>
          <div class="pass-hint">{{ t('game.tapToContinue') }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pass-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-deepest);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  cursor: pointer;
}

.pass-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  animation: fade-in 0.5s ease;
}

.pass-text {
  font-family: var(--font-ui);
  font-size: 1.2rem;
  color: var(--text-secondary);
  letter-spacing: 2px;
}

.pass-player-name {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: 6px;
  text-shadow:
    0 0 10px currentColor,
    0 0 20px currentColor,
    0 0 40px currentColor;
}

.pass-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  opacity: 0.5;
  animation: neon-pulse 2s ease-in-out infinite;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .pass-player-name {
    font-size: 2rem;
    letter-spacing: 3px;
  }

  .pass-text {
    font-size: 1rem;
  }
}
</style>
