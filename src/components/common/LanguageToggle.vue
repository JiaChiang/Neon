<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

function toggleLanguage() {
  locale.value = locale.value === 'zh-TW' ? 'en' : 'zh-TW'
}
</script>

<template>
  <button class="lang-toggle" @click="toggleLanguage" :title="locale === 'zh-TW' ? 'Switch to English' : '切換至中文'">
    <span class="lang-toggle__label" :class="{ active: locale === 'zh-TW' }">中</span>
    <span class="lang-toggle__separator">/</span>
    <span class="lang-toggle__label" :class="{ active: locale === 'en' }">EN</span>
  </button>
</template>

<style scoped>
.lang-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: var(--border-radius-md);
  background: transparent;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.85rem;
  transition: all var(--transition-normal);
}

.lang-toggle:hover {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
}

.lang-toggle__label {
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.lang-toggle__label.active {
  color: var(--neon-cyan);
  text-shadow: 0 0 4px var(--neon-cyan);
}

.lang-toggle__separator {
  color: var(--text-secondary);
  opacity: 0.4;
}
</style>
