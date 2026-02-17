<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MineCardType, MineEffectTiming } from '../../types/enums'
import { MINE_CARD_DEFINITIONS } from '../../constants/mineCards'
import NeonButton from '../common/NeonButton.vue'

const props = defineProps<{
  mineType: MineCardType
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const definition = computed(() => MINE_CARD_DEFINITIONS[props.mineType])
const isBlank = computed(() => props.mineType === MineCardType.BLANK)
const isPositive = computed(() => definition.value?.isPositive === true)
const isNegative = computed(() => definition.value?.isPositive === false)
const isDelayed = computed(() => definition.value?.timing === MineEffectTiming.DELAYED)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
        <div
          class="mine-modal"
          :class="{
            'mine-modal--blank': isBlank,
            'mine-modal--positive': isPositive,
            'mine-modal--negative': isNegative,
            'mine-modal--delayed': isDelayed,
          }"
        >
          <div class="mine-card-visual">
            <span class="mine-emoji">{{ definition?.emoji || '📄' }}</span>
          </div>

          <h2 class="mine-name">
            {{ isBlank ? t('mine.safe') : t('mine.reveal') }}
          </h2>

          <h3 v-if="!isBlank" class="mine-type-name">
            {{ t(definition?.nameKey || '') }}
          </h3>

          <p class="mine-desc">
            {{ t(definition?.descKey || '') }}
          </p>

          <div v-if="isDelayed" class="delayed-badge">
            🔄 延遲效果 / Delayed Effect
          </div>

          <NeonButton
            :variant="isBlank ? 'ghost' : isPositive ? 'primary' : 'danger'"
            @click="emit('close')"
          >
            OK
          </NeonButton>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
  backdrop-filter: blur(4px);
}

.mine-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) var(--space-2xl);
  background: var(--bg-surface);
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: var(--border-radius-xl);
  min-width: 320px;
  animation: scale-pop 0.4s ease;
  text-align: center;
}

.mine-modal--positive {
  border-color: rgba(48, 209, 88, 0.4);
  box-shadow: 0 0 30px rgba(48, 209, 88, 0.15);
}

.mine-modal--negative {
  border-color: rgba(255, 45, 85, 0.4);
  box-shadow: 0 0 30px rgba(255, 45, 85, 0.15);
}

.mine-modal--delayed {
  border-color: rgba(255, 149, 0, 0.4);
  box-shadow: 0 0 30px rgba(255, 149, 0, 0.15);
}

.mine-card-visual {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-dark);
  border: 2px solid rgba(255, 255, 255, 0.1);
  font-size: 2.5rem;
  animation: mine-reveal 0.6s ease;
}

.mine-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  letter-spacing: 3px;
  color: var(--text-primary);
}

.mine-type-name {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--neon-cyan);
  text-shadow: 0 0 4px var(--neon-cyan);
}

.mine-desc {
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--text-secondary);
  max-width: 280px;
  line-height: 1.5;
}

.delayed-badge {
  padding: 4px 12px;
  border: 1px solid rgba(255, 149, 0, 0.3);
  border-radius: 20px;
  font-size: 0.7rem;
  color: var(--neon-orange);
}

/* ---- Transition ---- */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
