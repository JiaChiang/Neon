<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Chip } from '../../types/game'
import {
  MARKET_FACE_UP_PRICES,
  MARKET_BLIND_PRICE,
  MARKET_DISCARD_PRICE,
} from '../../constants/gameConfig'
import ChipToken from '../board/ChipToken.vue'
import NeonButton from '../common/NeonButton.vue'

const props = defineProps<{
  faceUpSlots: (Chip | null)[]
  blindSlot: Chip | null
  discardPileCount: number
  playerMoney: number
  isActive: boolean
  marketDiscount: number
}>()

const emit = defineEmits<{
  'buy-face-up': [index: number]
  'buy-blind': []
  'open-discard': []
}>()

const { t } = useI18n()

function getPrice(basePrice: number) {
  return Math.max(0, basePrice - props.marketDiscount)
}

function canAfford(basePrice: number) {
  return props.playerMoney >= getPrice(basePrice)
}
</script>

<template>
  <div class="market-panel">
    <h3 class="market-title neon-text">{{ t('market.title') }}</h3>

    <!-- Face-up Slots -->
    <div class="market-section">
      <div class="section-label">{{ t('market.faceUp') }}</div>
      <div class="market-slots">
        <div
          v-for="(chip, index) in faceUpSlots"
          :key="index"
          class="market-slot"
          :class="{
            'slot--empty': !chip,
            'slot--affordable': chip && canAfford(MARKET_FACE_UP_PRICES[index]),
          }"
        >
          <ChipToken
            v-if="chip"
            :chip="chip"
            size="md"
          />
          <span v-else class="slot-empty-label">{{ t('market.empty') }}</span>
          <div class="slot-price" :class="{ discounted: marketDiscount > 0 }">
            <span v-if="marketDiscount > 0" class="original-price">${{ MARKET_FACE_UP_PRICES[index] }}</span>
            ${{ getPrice(MARKET_FACE_UP_PRICES[index]) }}
          </div>
          <NeonButton
            v-if="chip && isActive"
            size="sm"
            :disabled="!canAfford(MARKET_FACE_UP_PRICES[index])"
            @click="emit('buy-face-up', index)"
          >
            {{ t('action.confirm') }}
          </NeonButton>
        </div>
      </div>
    </div>

    <!-- Blind Slot -->
    <div class="market-section">
      <div class="section-label">{{ t('market.blind') }}</div>
      <div class="market-slots">
        <div
          class="market-slot slot--blind"
          :class="{ 'slot--affordable': blindSlot && canAfford(MARKET_BLIND_PRICE) }"
        >
          <ChipToken
            v-if="blindSlot"
            :chip="blindSlot"
            size="md"
            :face-down="true"
          />
          <span v-else class="slot-empty-label">{{ t('market.empty') }}</span>
          <div class="slot-price" :class="{ discounted: marketDiscount > 0 }">
            <span v-if="marketDiscount > 0" class="original-price">${{ MARKET_BLIND_PRICE }}</span>
            ${{ getPrice(MARKET_BLIND_PRICE) }}
          </div>
          <NeonButton
            v-if="blindSlot && isActive"
            size="sm"
            variant="secondary"
            :disabled="!canAfford(MARKET_BLIND_PRICE)"
            @click="emit('buy-blind')"
          >
            {{ t('action.confirm') }}
          </NeonButton>
        </div>
      </div>
    </div>

    <!-- Discard Pile -->
    <div class="market-section">
      <div class="section-label">{{ t('market.discardPile') }} ({{ discardPileCount }})</div>
      <div class="market-slots">
        <div class="market-slot slot--discard">
          <div class="discard-stack">📚 {{ discardPileCount }}</div>
          <div class="slot-price">${{ MARKET_DISCARD_PRICE }}</div>
          <NeonButton
            v-if="discardPileCount > 0 && isActive"
            size="sm"
            variant="ghost"
            :disabled="!canAfford(MARKET_DISCARD_PRICE)"
            @click="emit('open-discard')"
          >
            {{ t('action.confirm') }}
          </NeonButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.market-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid rgba(0, 229, 255, 0.08);
  border-radius: var(--border-radius-lg);
}

.market-title {
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 3px;
  text-align: center;
}

.market-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.market-slots {
  display: flex;
  gap: 8px;
}

.market-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--border-radius-md);
  background: var(--bg-dark);
  min-width: 70px;
  transition: all var(--transition-fast);
}

.slot--affordable {
  border-color: rgba(0, 229, 255, 0.2);
}

.slot--empty {
  opacity: 0.4;
}

.slot-empty-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  opacity: 0.5;
}

.slot-price {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--neon-yellow);
  text-shadow: 0 0 4px rgba(255, 204, 0, 0.3);
}

.slot-price.discounted {
  color: var(--neon-green);
}

.original-price {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-decoration: line-through;
  margin-right: 4px;
}

.slot--blind {
  border-style: dashed;
}

.discard-stack {
  font-size: 1.2rem;
}

@media (max-width: 768px) {
  .market-panel {
    padding: var(--space-sm);
    gap: var(--space-sm);
  }

  .market-title {
    font-size: 0.85rem;
    letter-spacing: 2px;
  }

  .market-slots {
    gap: 6px;
    flex-wrap: wrap;
  }

  .market-slot {
    min-width: 56px;
    padding: 6px;
    gap: 4px;
    flex: 1;
  }

  .slot-price {
    font-size: 0.7rem;
  }

  .section-label {
    font-size: 0.65rem;
  }
}
</style>
