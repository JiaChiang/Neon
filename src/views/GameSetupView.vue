<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { PlayerColor, ChipType } from '../types/enums'
import type { Player, Chip } from '../types/game'
import { CHARACTERS } from '../constants/characters'
import {
  DEFAULT_GAME_CONFIG,
  PLAYER_COLORS_CSS,
  MARKET_FACE_UP_PRICES,
  MARKET_BLIND_PRICE,
  MARKET_FACE_UP_COUNT,
} from '../constants/gameConfig'
import { generateMineCardDistribution } from '../constants/mineCards'
import { shuffle, generateId } from '../utils/shuffle'
import { useGameStore } from '../stores/gameStore'
import { useBoardStore } from '../stores/boardStore'
import { useMarketStore } from '../stores/marketStore'
import { useTurnStore } from '../stores/turnStore'
import NeonButton from '../components/common/NeonButton.vue'
import NeonCard from '../components/common/NeonCard.vue'
import LanguageToggle from '../components/common/LanguageToggle.vue'

const router = useRouter()
const { t } = useI18n()
const gameStore = useGameStore()
const boardStore = useBoardStore()
const marketStore = useMarketStore()
const turnStore = useTurnStore()

// ---- State ----
const playerCount = ref(2)
const availableColors = Object.values(PlayerColor)

interface PlayerSetup {
  name: string
  color: PlayerColor
  characterIndex: number | null
}

const playerSetups = ref<PlayerSetup[]>([
  { name: '', color: PlayerColor.RED, characterIndex: null },
  { name: '', color: PlayerColor.BLUE, characterIndex: null },
])

// ---- Computed ----
const usedColors = computed(() => playerSetups.value.map((p) => p.color))
const usedCharacters = computed(() =>
  playerSetups.value.map((p) => p.characterIndex).filter((i) => i !== null) as number[]
)

const isValid = computed(() => {
  return playerSetups.value.every((p) => p.color) &&
    new Set(usedColors.value).size === playerSetups.value.length
})

// ---- Methods ----
function updatePlayerCount(count: number) {
  playerCount.value = count
  const defaultColors = [
    PlayerColor.RED, PlayerColor.BLUE, PlayerColor.YELLOW,
    PlayerColor.GREEN, PlayerColor.PURPLE, PlayerColor.ORANGE,
  ]

  while (playerSetups.value.length < count) {
    const usedC = playerSetups.value.map((p) => p.color)
    const nextColor = defaultColors.find((c) => !usedC.includes(c)) || defaultColors[0]
    playerSetups.value.push({
      name: '',
      color: nextColor,
      characterIndex: null,
    })
  }
  while (playerSetups.value.length > count) {
    playerSetups.value.pop()
  }
}

function getAvailableColors(currentColor: PlayerColor) {
  return availableColors.filter(
    (c) => c === currentColor || !usedColors.value.includes(c)
  )
}

function randomizeCharacters() {
  const shuffled = shuffle([...Array(CHARACTERS.length).keys()])
  playerSetups.value.forEach((p, i) => {
    p.characterIndex = shuffled[i % shuffled.length]
  })
}

function startGame() {
  // Auto-assign characters if not selected
  if (playerSetups.value.some((p) => p.characterIndex === null)) {
    randomizeCharacters()
  }

  const config = { ...DEFAULT_GAME_CONFIG, playerCount: playerCount.value }

  // Create players
  const players: Player[] = playerSetups.value.map((setup, index) => ({
    id: generateId('player'),
    name: setup.name || t('setup.playerName', { n: index + 1 }),
    color: setup.color,
    character: CHARACTERS[setup.characterIndex!],
    isAwakened: false,
    money: config.startingMoney,
    hand: [],
    completedSlots: 0,
    totalSlots: config.slotsPerPlayer,
    statusEffects: [],
    virusChipsPlaced: 0,
    positiveMinesTriggered: 0,
    completedSlotsData: 0,
  }))

  // Initialize chip bag
  const allChips: Chip[] = []
  for (let i = 0; i < config.dataChipCount; i++) {
    allChips.push({ id: generateId('chip'), type: ChipType.DATA })
  }
  for (let i = 0; i < config.virusChipCount; i++) {
    allChips.push({ id: generateId('chip'), type: ChipType.VIRUS })
  }
  const shuffledChips = shuffle(allChips)

  // Draw starting hands
  let chipIndex = 0
  for (const player of players) {
    player.hand = shuffledChips.slice(chipIndex, chipIndex + config.startingHandSize)
    chipIndex += config.startingHandSize
  }

  // Remaining chips go to bag
  const bagChips = shuffledChips.slice(chipIndex)

  // Initialize board
  boardStore.initializeBoard(config.boardRows, config.boardCols)

  // Generate mine cards
  const totalCells = config.boardRows * config.boardCols
  const mineTypes = generateMineCardDistribution(totalCells)

  // Initialize game store
  gameStore.initializeGame({
    config,
    players,
    chipBag: bagChips,
    mineTypes,
  })

  // Initialize market
  marketStore.initializeMarket(() => gameStore.drawChips(1))

  // Initialize draft
  boardStore.initDraft(playerCount.value)

  // Navigate to draft
  router.push('/draft')
}

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="setup-view">
    <!-- Header -->
    <div class="setup-header">
      <NeonButton variant="ghost" size="sm" @click="goBack">
        ← {{ t('setup.back') }}
      </NeonButton>
      <h1 class="setup-title neon-text">{{ t('setup.title') }}</h1>
      <LanguageToggle />
    </div>

    <!-- Player Count -->
    <div class="setup-section">
      <h2 class="section-title">{{ t('setup.playerCount') }}</h2>
      <div class="count-selector">
        <button
          v-for="n in [2, 3, 4, 5, 6]"
          :key="n"
          class="count-btn"
          :class="{ active: playerCount === n }"
          @click="updatePlayerCount(n)"
        >
          {{ n }}
        </button>
      </div>
    </div>

    <!-- Player Settings -->
    <div class="setup-players">
      <NeonCard
        v-for="(setup, index) in playerSetups"
        :key="index"
        :glow-color="PLAYER_COLORS_CSS[setup.color]"
        class="player-card"
      >
        <div class="player-card-header">
          <span
            class="player-color-dot"
            :style="{ background: PLAYER_COLORS_CSS[setup.color] }"
          />
          <input
            v-model="setup.name"
            class="player-name-input"
            :placeholder="t('setup.playerName', { n: index + 1 })"
          />
        </div>

        <!-- Color Selection -->
        <div class="color-row">
          <span class="row-label">{{ t('setup.selectColor') }}</span>
          <div class="color-options">
            <button
                v-for="color in availableColors"
                :key="color"
                class="color-btn"
                :class="{ 
                  active: setup.color === color,
                  disabled: !getAvailableColors(setup.color).includes(color)
                }"
                :style="{
                  '--color': PLAYER_COLORS_CSS[color],
                  background: PLAYER_COLORS_CSS[color], 
                  }"
                :disabled="!getAvailableColors(setup.color).includes(color)"
                @click="setup.color = color"
            />
          </div>
        </div>

        <!-- Character Selection -->
        <div class="character-row">
          <span class="row-label">{{ t('setup.selectCharacter') }}</span>
          <div class="character-options">
            <button
              v-for="(char, ci) in CHARACTERS"
              :key="char.id"
              class="character-btn"
              :class="{
                active: setup.characterIndex === ci,
                taken: usedCharacters.includes(ci) && setup.characterIndex !== ci,
              }"
              :style="{ '--char-color': char.color }"
              :disabled="usedCharacters.includes(ci) && setup.characterIndex !== ci"
              @click="setup.characterIndex = ci"
            >
              <span class="char-name">{{ t(char.nameKey) }}</span>
              <span class="char-title">{{ t(char.titleKey) }}</span>
            </button>
          </div>
        </div>
      </NeonCard>
    </div>

    <!-- Actions -->
    <div class="setup-actions">
      <NeonButton variant="secondary" @click="randomizeCharacters">
        🎲 {{ t('setup.randomCharacter') }}
      </NeonButton>
      <NeonButton size="lg" :disabled="!isValid" @click="startGame">
        {{ t('setup.startGame') }} →
      </NeonButton>
    </div>
  </div>
</template>

<style scoped>
.setup-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--space-lg);
  overflow-y: auto;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(0, 229, 255, 0.04) 0%, transparent 60%),
    var(--bg-deepest);
}

.setup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
}

.setup-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  letter-spacing: 4px;
}

/* ---- Player Count ---- */
.setup-section {
  margin-bottom: var(--space-xl);
}

.section-title {
  font-family: var(--font-ui);
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.count-selector {
  display: flex;
  gap: var(--space-sm);
}

.count-btn {
  width: 48px;
  height: 48px;
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: var(--border-radius-md);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-family: var(--font-display);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.count-btn:hover {
  border-color: var(--neon-cyan);
  color: var(--text-primary);
}

.count-btn.active {
  border-color: var(--neon-cyan);
  background: rgba(0, 229, 255, 0.1);
  color: var(--neon-cyan);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
}

/* ---- Player Cards ---- */
.setup-players {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.player-card {
  padding: var(--space-md) !important;
}

.player-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.player-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px currentColor;
}

.player-name-input {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(0, 229, 255, 0.15);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 1.1rem;
  padding: 4px 0;
  outline: none;
  transition: border-color var(--transition-normal);
}

.player-name-input:focus {
  border-color: var(--neon-cyan);
}

.player-name-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

/* ---- Color Row ---- */
.color-row,
.character-row {
  margin-bottom: var(--space-md);
}

.row-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.color-options {
  display: flex;
  gap: 6px;
}



/* ---- Character Row ---- */
.character-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.character-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-sm);
  background: var(--bg-dark);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.character-btn:hover:not(:disabled) {
  border-color: var(--char-color);
}

.character-btn.active {
  border-color: var(--char-color);
  background: color-mix(in srgb, var(--char-color) 10%, var(--bg-dark));
  box-shadow: 0 0 8px color-mix(in srgb, var(--char-color) 30%, transparent);
}

.character-btn.taken {
  opacity: 0.25;
  cursor: not-allowed;
}

.char-name {
  font-family: var(--font-ui);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}

.char-title {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

/* ---- Actions ---- */
.setup-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-lg) 0;
}

@media (max-width: 768px) {
  .setup-view {
    padding: var(--space-md);
  }

  .setup-title {
    font-size: 1.2rem;
    letter-spacing: 2px;
  }

  .setup-players {
    grid-template-columns: 1fr;
  }

  .character-options {
    gap: 4px;
  }

  .character-btn {
    padding: 4px 8px;
  }

  .char-name {
    font-size: 0.7rem;
  }

  .char-title {
    font-size: 0.55rem;
  }

  .setup-actions {
    flex-direction: column;
    align-items: center;
  }
}

.color-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  opacity: 0.6;
  position: relative; /* 必備，讓偽元素能定位在上方 */
  overflow: hidden; /* 確保斜槓不會超出圓圈 */
  margin-right: 3px;
}

.color-btn:hover {
  opacity: 1;
  transform: scale(1.15);
}

.color-btn.active {
  opacity: 1;
  border-color: white;
  transform: scale(1.2);
  box-shadow: 0 0 8px var(--color);
}

/* 當按鈕處於 disabled 狀態時 */
.color-btn.disabled {
  cursor: not-allowed;
  opacity: 0.7; /* 稍微降點透明度，讓使用者知道不可選 */
}

.color-btn.disabled::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  /* 畫出禁止符號：外圈 + 中間斜線 */
  background:
      linear-gradient(
          45deg,
          transparent 45%,
          rgba(255, 255, 255, 0.8) 45%,
          rgba(255, 255, 255, 0.8) 55%,
          transparent 55%
      );
  border: 3px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  box-sizing: border-box;
}
</style>
