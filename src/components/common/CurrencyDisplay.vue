<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  amount: number
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}>()

const formattedAmount = computed(() => `$${props.amount}`)
</script>

<template>
  <span
    class="currency"
    :class="[
      `currency--${size || 'md'}`,
      { 'currency--animate': animate }
    ]"
  >
    <span class="currency__icon">💰</span>
    <span class="currency__amount">{{ formattedAmount }}</span>
  </span>
</template>

<style scoped>
.currency {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--neon-yellow);
  text-shadow: 0 0 4px rgba(255, 204, 0, 0.4);
}

.currency--sm {
  font-size: 0.75rem;
}

.currency--md {
  font-size: 1rem;
}

.currency--lg {
  font-size: 1.4rem;
}

.currency__icon {
  font-size: 0.9em;
}

.currency--animate .currency__amount {
  animation: money-gain 0.5s ease;
}
</style>
