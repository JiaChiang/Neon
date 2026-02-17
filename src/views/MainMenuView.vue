<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NeonButton from '../components/common/NeonButton.vue'
import LanguageToggle from '../components/common/LanguageToggle.vue'

const router = useRouter()
const { t } = useI18n()

function startNewGame() {
  router.push('/setup')
}
</script>

<template>
  <div class="menu-view">
    <!-- Background particles -->
    <div class="menu-particles">
      <div v-for="i in 20" :key="i" class="particle" :style="{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
      }" />
    </div>

    <!-- Language Toggle -->
    <div class="menu-lang">
      <LanguageToggle />
    </div>

    <!-- Main Content -->
    <div class="menu-content">
      <!-- Logo -->
      <div class="menu-logo">
        <h1 class="menu-title">
          <span class="title-neon">{{ t('app.subtitle') }}</span>
        </h1>
        <h2 class="menu-subtitle">{{ t('app.title') }}</h2>
        <p class="menu-tagline">{{ t('app.tagline') }}</p>
      </div>

      <!-- Game Info -->
      <div class="menu-info">
        <span class="info-badge">2-6 👥</span>
        <span class="info-badge">30 min ⏱️</span>
        <span class="info-badge">12+ 🎯</span>
      </div>

      <!-- Buttons -->
      <div class="menu-actions">
        <NeonButton size="lg" @click="startNewGame">
          {{ t('menu.newGame') }}
        </NeonButton>
      </div>
    </div>

    <!-- Decorative Lines -->
    <div class="menu-deco-left" />
    <div class="menu-deco-right" />
  </div>
</template>

<style scoped>
.menu-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(0, 229, 255, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 50%, rgba(191, 90, 242, 0.06) 0%, transparent 50%),
    var(--bg-deepest);
}

/* ---- Particles ---- */
.menu-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: var(--neon-cyan);
  border-radius: 50%;
  opacity: 0;
  animation: float-particle linear infinite;
}

@keyframes float-particle {
  0% { opacity: 0; transform: translateY(0) scale(1); }
  10% { opacity: 0.6; }
  90% { opacity: 0.2; }
  100% { opacity: 0; transform: translateY(-100px) scale(0); }
}

/* ---- Language ---- */
.menu-lang {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  z-index: 10;
}

/* ---- Content ---- */
.menu-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  z-index: 2;
  animation: fade-in 1s ease;
}

/* ---- Logo ---- */
.menu-logo {
  text-align: center;
}

.menu-title {
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 900;
  letter-spacing: 8px;
  margin-bottom: var(--space-sm);
}

.title-neon {
  color: var(--neon-cyan);
  text-shadow:
    0 0 4px var(--neon-cyan),
    0 0 11px var(--neon-cyan),
    0 0 19px var(--neon-cyan),
    0 0 40px var(--neon-blue),
    0 0 80px var(--neon-blue);
  animation: logo-flicker 4s infinite alternate;
}

.menu-subtitle {
  font-family: var(--font-body);
  font-size: 1.6rem;
  font-weight: 300;
  color: var(--text-secondary);
  letter-spacing: 12px;
  text-transform: uppercase;
}

.menu-tagline {
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-top: var(--space-md);
  opacity: 0.6;
}

/* ---- Info Badges ---- */
.menu-info {
  display: flex;
  gap: var(--space-md);
}

.info-badge {
  padding: 6px 16px;
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 20px;
  font-family: var(--font-ui);
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: rgba(0, 229, 255, 0.03);
}

/* ---- Actions ---- */
.menu-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

/* ---- Decorative Lines ---- */
.menu-deco-left,
.menu-deco-right {
  position: absolute;
  width: 1px;
  height: 60%;
  top: 20%;
}

.menu-deco-left {
  left: 10%;
  background: linear-gradient(to bottom, transparent, rgba(0, 229, 255, 0.2), transparent);
}

.menu-deco-right {
  right: 10%;
  background: linear-gradient(to bottom, transparent, rgba(191, 90, 242, 0.2), transparent);
}

@media (max-width: 768px) {
  .menu-title {
    font-size: 2.2rem;
    letter-spacing: 4px;
  }

  .menu-subtitle {
    font-size: 1rem;
    letter-spacing: 6px;
  }

  .menu-tagline {
    font-size: 0.8rem;
  }

  .menu-info {
    gap: var(--space-sm);
  }

  .info-badge {
    padding: 4px 10px;
    font-size: 0.75rem;
  }

  .menu-deco-left,
  .menu-deco-right {
    display: none;
  }

  .menu-content {
    gap: var(--space-lg);
    padding: 0 var(--space-md);
  }
}
</style>
