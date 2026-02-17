<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TurnPhase, ActionType, StatusEffect } from '../../types/enums'
import type { Player } from '../../types/game'
import NeonButton from '../common/NeonButton.vue'

const props = defineProps<{
  currentPhase: TurnPhase
  player: Player
  skillCost: number
  freeSkillAvailable: boolean
  skillUsedThisTurn: boolean
  canUseSkillResult: { canUse: boolean; reason?: string }
  mainActionChosen: ActionType | null
  hasChipsInHand: boolean
}>()

const emit = defineEmits<{
  'use-skill': []
  'skip-skill': []
  'choose-action': [action: ActionType]
  'end-turn': []
  'remove-virus': []
}>()

const { t } = useI18n()

const showCharacterInfo = ref(false)

const isSkillPhase = computed(() => props.currentPhase === TurnPhase.SKILL_PHASE)
const isMainAction = computed(() => props.currentPhase === TurnPhase.MAIN_ACTION)
const isEndResolution = computed(() => props.currentPhase === TurnPhase.END_RESOLUTION)

const isMarketFrozen = computed(() =>
  props.player.statusEffects.includes(StatusEffect.ASSET_FREEZE)
)

const skillButtonLabel = computed(() => {
  if (props.freeSkillAvailable) return `${t('action.useSkill')} (${t('action.skillFree')})`
  return `${t('action.useSkill')} (${t('action.skillCost')})`
})
</script>

<template>
  <div class="action-panel">
    <!-- Skill Phase -->
    <div v-if="isSkillPhase" class="phase-section">
      <h3 class="phase-title neon-text">{{ t('game.phase.skill') }}</h3>
      <div class="action-buttons">
        <NeonButton
          variant="secondary"
          size="sm"
          @click="showCharacterInfo = true"
        >
          📋 {{ t('action.viewCharacter') }}
        </NeonButton>
        <NeonButton
          :disabled="!canUseSkillResult.canUse && !freeSkillAvailable"
          @click="emit('use-skill')"
        >
          ⚡ {{ skillButtonLabel }}
        </NeonButton>
        <NeonButton variant="ghost" @click="emit('skip-skill')">
          {{ t('action.skipSkill') }} →
        </NeonButton>
      </div>
      <p v-if="!canUseSkillResult.canUse && canUseSkillResult.reason" class="skill-reason">
        {{ canUseSkillResult.reason }}
      </p>
    </div>

    <!-- Main Action Phase -->
    <div v-if="isMainAction && !mainActionChosen" class="phase-section">
      <h3 class="phase-title neon-text">{{ t('action.title') }}</h3>
      <div class="action-buttons">
        <NeonButton
          :disabled="!hasChipsInHand"
          glow-color="var(--neon-green)"
          @click="emit('choose-action', ActionType.CHIP_INSTALL)"
        >
          🔧 {{ t('action.chipInstall') }}
        </NeonButton>
        <NeonButton
          :disabled="!hasChipsInHand"
          glow-color="var(--neon-orange)"
          @click="emit('choose-action', ActionType.CHIP_RECYCLE)"
        >
          ♻️ {{ t('action.chipRecycle') }}
        </NeonButton>
        <NeonButton
          :disabled="isMarketFrozen"
          glow-color="var(--neon-purple)"
          @click="emit('choose-action', ActionType.MARKET_PURCHASE)"
        >
          🛒 {{ t('action.marketPurchase') }}
        </NeonButton>
      </div>

      <p v-if="isMarketFrozen" class="freeze-warning neon-text-warning">
        🧊 {{ t('mine.assetFreeze.desc') }}
      </p>
    </div>

    <!-- Action descriptions -->
    <div v-if="isMainAction && !mainActionChosen" class="action-descriptions">
      <div class="desc-item">
        <span class="desc-icon">🔧</span>
        <span class="desc-text">{{ t('action.chipInstallDesc') }}</span>
      </div>
      <div class="desc-item">
        <span class="desc-icon">♻️</span>
        <span class="desc-text">{{ t('action.chipRecycleDesc') }}</span>
      </div>
      <div class="desc-item">
        <span class="desc-icon">🛒</span>
        <span class="desc-text">{{ t('action.marketPurchaseDesc') }}</span>
      </div>
    </div>

    <!-- Virus Removal (available anytime) -->
    <div v-if="isMainAction && !mainActionChosen" class="virus-removal">
      <NeonButton
        variant="danger"
        size="sm"
        :disabled="!hasChipsInHand"
        @click="emit('remove-virus')"
      >
        🦠 {{ t('action.removeVirus') }}
      </NeonButton>
      <span class="virus-desc">{{ t('action.removeVirusDesc') }}</span>
    </div>

    <!-- End Turn -->
    <div v-if="(isMainAction && mainActionChosen) || isEndResolution" class="end-section">
      <NeonButton variant="ghost" @click="emit('end-turn')">
        {{ t('action.endTurn') }} →
      </NeonButton>
    </div>

    <!-- Character Info Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showCharacterInfo" class="char-modal-overlay" @click.self="showCharacterInfo = false">
          <div class="char-modal" :style="{ '--char-color': player.character.color }">
            <div class="char-modal-header">
              <span class="char-modal-dot" />
              <h2 class="char-modal-name">{{ t(player.character.nameKey) }}</h2>
              <span class="char-modal-title">{{ t(player.character.titleKey) }}</span>
            </div>

            <div class="char-skill-section">
              <div class="char-skill-label">{{ t('action.basicSkill') }}</div>
              <div class="char-skill-name">{{ t(player.character.basicSkillKey) }}</div>
              <div class="char-skill-desc">{{ t(player.character.basicDescKey) }}</div>
            </div>

            <div class="char-skill-section char-skill-section--awaken" :class="{ 'char-skill-section--active': player.isAwakened }">
              <div class="char-skill-label">
                {{ t('action.awakenSkill') }}
                <span v-if="!player.isAwakened" class="locked-badge">🔒</span>
                <span v-else class="unlocked-badge">⚡</span>
              </div>
              <div class="char-skill-name">{{ t(player.character.awakenSkillKey) }}</div>
              <div class="char-skill-desc">{{ t(player.character.awakenDescKey) }}</div>
            </div>

            <div class="char-awaken-info">
              {{ t('action.awakenCondition') }}
            </div>

            <NeonButton variant="ghost" @click="showCharacterInfo = false">
              {{ t('action.confirm') }}
            </NeonButton>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.action-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.phase-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.phase-title {
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.action-buttons {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.skill-reason {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
}

.freeze-warning {
  font-size: 0.75rem;
}

.action-descriptions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 229, 255, 0.02);
  border-radius: var(--border-radius-sm);
}

.desc-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.desc-icon {
  font-size: 0.9rem;
}

.virus-removal {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.virus-desc {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.end-section {
  display: flex;
  justify-content: flex-end;
}

/* ---- Character Info Modal ---- */
.char-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
  backdrop-filter: blur(4px);
}

.char-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-xl);
  background: var(--bg-surface);
  border: 1px solid color-mix(in srgb, var(--char-color) 40%, transparent);
  border-radius: var(--border-radius-xl);
  min-width: 360px;
  max-width: 440px;
  animation: scale-pop 0.3s ease;
  box-shadow: 0 0 30px color-mix(in srgb, var(--char-color) 15%, transparent);
}

.char-modal-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.char-modal-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--char-color);
  box-shadow: 0 0 8px var(--char-color);
}

.char-modal-name {
  font-family: var(--font-display);
  font-size: 1.3rem;
  color: var(--char-color);
  text-shadow: 0 0 6px color-mix(in srgb, var(--char-color) 50%, transparent);
  letter-spacing: 2px;
}

.char-modal-title {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.char-skill-section {
  padding: var(--space-md);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--border-radius-md);
  background: var(--bg-dark);
}

.char-skill-section--awaken {
  border-color: rgba(255, 255, 255, 0.04);
  opacity: 0.5;
}

.char-skill-section--active {
  opacity: 1;
  border-color: color-mix(in srgb, var(--char-color) 30%, transparent);
  background: color-mix(in srgb, var(--char-color) 5%, var(--bg-dark));
}

.char-skill-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.locked-badge {
  font-size: 0.65rem;
  opacity: 0.5;
}

.unlocked-badge {
  font-size: 0.75rem;
  color: var(--neon-yellow);
}

.char-skill-name {
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.char-skill-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.char-awaken-info {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
  opacity: 0.6;
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
  .action-panel {
    gap: var(--space-sm);
  }

  .phase-title {
    font-size: 0.7rem;
    letter-spacing: 1px;
  }

  .action-buttons {
    gap: 4px;
  }

  .action-descriptions {
    display: none;
  }

  .virus-removal {
    padding-top: 4px;
  }

  .virus-desc {
    display: none;
  }

  .char-modal {
    min-width: unset;
    max-width: 90vw;
    padding: var(--space-md);
    margin: 0 16px;
  }

  .char-modal-name {
    font-size: 1rem;
  }

  .char-skill-desc {
    font-size: 0.75rem;
    line-height: 1.4;
  }
}
</style>
