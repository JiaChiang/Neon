<script setup lang="ts">
defineProps<{
  glowColor?: string
  hoverable?: boolean
  selected?: boolean
}>()
</script>

<template>
  <div
    class="neon-card"
    :class="{
      'neon-card--hoverable': hoverable,
      'neon-card--selected': selected,
    }"
    :style="glowColor ? { '--card-glow': glowColor } : {}"
  >
    <slot />
  </div>
</template>

<style scoped>
.neon-card {
  --card-glow: var(--neon-cyan);
  position: relative;
  background: var(--bg-elevated);
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: var(--border-radius-lg);
  padding: var(--space-md);
  transition: all var(--transition-normal);
}

.neon-card--hoverable {
  cursor: pointer;
}

.neon-card--hoverable:hover {
  border-color: var(--card-glow);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--card-glow) 30%, transparent),
    inset 0 0 8px color-mix(in srgb, var(--card-glow) 5%, transparent);
  transform: translateY(-2px);
}

.neon-card--selected {
  border-color: var(--card-glow);
  box-shadow:
    0 0 8px var(--card-glow),
    0 0 16px color-mix(in srgb, var(--card-glow) 50%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--card-glow) 10%, transparent);
}
</style>
