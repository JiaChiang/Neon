<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Player } from '../../types/game'
import { PLAYER_COLORS_CSS } from '../../constants/gameConfig'
import CurrencyDisplay from '../common/CurrencyDisplay.vue'

const props = defineProps<{
  player: Player
  isActive: boolean
}>()

const { t } = useI18n()

const playerColor = computed(() => PLAYER_COLORS_CSS[props.player.color])
</script>

<template>
  <div
    class="player-hud"
    :class="{ 'player-hud--active': isActive }"
    :style="{ '--player-color': playerColor }"
  >
    <div class="hud-header">
      <span class="hud-color-dot" />
      <span class="hud-name">{{ player.name }}</span>
      <span class="hud-character">{{ t(player.character.nameKey) }}</span>
    </div>

    <div class="hud-stats">
      <div class="stat">
        <CurrencyDisplay :amount="player.money" size="sm" />
      </div>
      <div class="stat">
        <span class="stat-label">{{ t('game.completed') }}</span>
        <span class="stat-value">{{ player.completedSlots }}/{{ player.totalSlots }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">{{ t('game.hand') }}</span>
        <span class="stat-value">{{ player.hand.length }}</span>
      </div>
    </div>

    <!-- Awakened indicator -->
    <div v-if="player.isAwakened" class="awakened-badge">
      ⚡ {{ t('awakening.title') }}
    </div>
  </div>
</template>

<style scoped>
.player-hud {
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--border-radius-md);
  background: var(--bg-elevated);
  transition: all var(--transition-normal);
  border-left: 3px solid var(--player-color);
}

.player-hud--active {
  border-color: var(--player-color);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--player-color) 25%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--player-color) 5%, transparent);
  background: color-mix(in srgb, var(--player-color) 5%, var(--bg-elevated));
}

.hud-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.hud-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--player-color);
  box-shadow: 0 0 6px var(--player-color);
}

.hud-name {
  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.hud-character {
  font-size: 0.7rem;
  color: var(--text-secondary);
  opacity: 0.7;
}

.hud-stats {
  display: flex;
  gap: 12px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--neon-cyan);
}

.awakened-badge {
  margin-top: 6px;
  font-size: 0.65rem;
  color: var(--neon-pink);
  text-shadow: 0 0 4px var(--neon-pink);
  letter-spacing: 1px;
}

@media (max-width: 768px) {
  .player-hud {
    padding: 8px 10px;
  }

  .hud-header {
    margin-bottom: 4px;
    gap: 6px;
  }

  .hud-name {
    font-size: 0.85rem;
  }

  .hud-character {
    font-size: 0.6rem;
  }

  .hud-stats {
    gap: 8px;
    flex-wrap: wrap;
  }

  .stat-label {
    font-size: 0.6rem;
  }

  .stat-value {
    font-size: 0.7rem;
  }

  .hud-color-dot {
    width: 8px;
    height: 8px;
  }
}
</style>
