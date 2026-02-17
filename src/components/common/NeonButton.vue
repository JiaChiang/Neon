<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  glowColor?: string
}>()

defineEmits<{
  click: [e: MouseEvent]
}>()
</script>

<template>
  <button
    class="neon-button"
    :class="[
      `neon-button--${variant || 'primary'}`,
      `neon-button--${size || 'md'}`,
      { 'neon-button--disabled': disabled }
    ]"
    :style="glowColor ? { '--btn-glow': glowColor } : {}"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <span class="neon-button__content">
      <slot />
    </span>
    <span class="neon-button__glow" />
  </button>
</template>

<style scoped>
.neon-button {
  --btn-glow: var(--neon-cyan);
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--btn-glow);
  background: rgba(0, 229, 255, 0.05);
  color: var(--text-primary);
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  overflow: hidden;
  transition: all var(--transition-normal);
  border-radius: var(--border-radius-md);
}

.neon-button--sm {
  padding: 6px 16px;
  font-size: 0.7rem;
}

.neon-button--md {
  padding: 10px 24px;
  font-size: 0.85rem;
}

.neon-button--lg {
  padding: 14px 36px;
  font-size: 1rem;
}

.neon-button__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.neon-button__glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: radial-gradient(ellipse at center, var(--btn-glow), transparent 70%);
  transition: opacity var(--transition-normal);
}

.neon-button:hover:not(:disabled) {
  box-shadow:
    0 0 8px var(--btn-glow),
    0 0 16px var(--btn-glow),
    inset 0 0 8px rgba(0, 229, 255, 0.1);
  transform: translateY(-1px);
}

.neon-button:hover:not(:disabled) .neon-button__glow {
  opacity: 0.15;
}

.neon-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 0 4px var(--btn-glow);
}

/* ---- Variants ---- */
.neon-button--primary {
  --btn-glow: var(--neon-cyan);
}

.neon-button--secondary {
  --btn-glow: var(--neon-purple);
  border-color: var(--neon-purple);
  background: rgba(191, 90, 242, 0.05);
}

.neon-button--danger {
  --btn-glow: var(--neon-red);
  border-color: var(--neon-red);
  background: rgba(255, 45, 85, 0.05);
}

.neon-button--ghost {
  --btn-glow: var(--text-secondary);
  border-color: rgba(122, 133, 153, 0.3);
  background: transparent;
}

.neon-button--ghost:hover:not(:disabled) {
  border-color: var(--text-secondary);
}

/* ---- Disabled ---- */
.neon-button--disabled {
  opacity: 0.35;
  cursor: not-allowed;
  filter: grayscale(0.5);
}
</style>
