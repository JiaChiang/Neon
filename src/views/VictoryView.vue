<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '../stores/gameStore'
import { calculateFinalRankings } from '../engine/VictoryChecker'
import { PLAYER_COLORS_CSS } from '../constants/gameConfig'
import NeonButton from '../components/common/NeonButton.vue'
import CurrencyDisplay from '../components/common/CurrencyDisplay.vue'

const router = useRouter()
const { t } = useI18n()
const gameStore = useGameStore()

const rankings = computed(() => calculateFinalRankings(gameStore.players))
const winner = computed(() => rankings.value[0])

function playAgain() {
  router.push('/setup')
}

function backToMenu() {
  router.push('/')
}
</script>

<template>
  <div class="victory-view">
    <div class="victory-content">
      <h1 class="victory-title">{{ t('victory.title') }}</h1>

      <!-- Winner -->
      <div v-if="winner" class="winner-section">
        <div class="trophy">🏆</div>
        <h2
          class="winner-name"
          :style="{ color: PLAYER_COLORS_CSS[winner.playerColor] }"
        >
          {{ t('victory.winner', { name: winner.playerName }) }}
        </h2>
      </div>

      <!-- Rankings -->
      <div class="rankings">
        <div
          v-for="entry in rankings"
          :key="entry.playerId"
          class="rank-row"
          :class="{ 'rank-row--winner': entry.rank === 1 }"
          :style="{ '--player-color': PLAYER_COLORS_CSS[entry.playerColor] }"
        >
          <span class="rank-number">{{ t('victory.rank', { n: entry.rank }) }}</span>
          <span class="rank-dot" :style="{ background: PLAYER_COLORS_CSS[entry.playerColor] }" />
          <span class="rank-name">{{ entry.playerName }}</span>
          <span class="rank-stat">
            {{ t('victory.completedSlots') }}: {{ entry.completedSlots }}
          </span>
          <CurrencyDisplay :amount="entry.money" size="sm" />
        </div>
      </div>

      <!-- Actions -->
      <div class="victory-actions">
        <NeonButton @click="playAgain">{{ t('victory.playAgain') }}</NeonButton>
        <NeonButton variant="ghost" @click="backToMenu">{{ t('victory.backToMenu') }}</NeonButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.victory-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(255, 204, 0, 0.08) 0%, transparent 50%),
    var(--bg-deepest);
}

.victory-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  animation: fade-in 1s ease;
}

.victory-title {
  font-family: var(--font-display);
  font-size: 2rem;
  letter-spacing: 6px;
  color: var(--text-primary);
}

.winner-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.trophy {
  font-size: 4rem;
  animation: scale-pop 0.6s ease;
}

.winner-name {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 4px;
  text-shadow:
    0 0 10px currentColor,
    0 0 20px currentColor;
}

.rankings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 400px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 12px 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--border-radius-md);
  background: var(--bg-elevated);
  transition: all var(--transition-normal);
}

.rank-row--winner {
  border-color: var(--player-color);
  box-shadow: 0 0 12px color-mix(in srgb, var(--player-color) 25%, transparent);
}

.rank-number {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 60px;
}

.rank-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
}

.rank-name {
  flex: 1;
  font-weight: 600;
}

.rank-stat {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.victory-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}
</style>
