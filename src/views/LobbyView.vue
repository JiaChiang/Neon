<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWebSocket } from '../network/useWebSocket'
import { ServerMsg } from '../network/protocol'
import { CHARACTERS } from '../constants/characters'
import { PLAYER_COLORS_CSS } from '../constants/gameConfig'
import { PlayerColor, ChipType } from '../types/enums'
import type { Player, Chip } from '../types/game'
import {
  DEFAULT_GAME_CONFIG,
} from '../constants/gameConfig'
import { generateMineCardDistribution } from '../constants/mineCards'
import { shuffle, generateId } from '../utils/shuffle'
import { useGameStore } from '../stores/gameStore'
import { useBoardStore } from '../stores/boardStore'
import { useMarketStore } from '../stores/marketStore'
import NeonButton from '../components/common/NeonButton.vue'
import LanguageToggle from '../components/common/LanguageToggle.vue'

const router = useRouter()
const { t } = useI18n()
const ws = useWebSocket()
const gameStore = useGameStore()
const boardStore = useBoardStore()
const marketStore = useMarketStore()

// ---- UI State ----
const step = ref<'connect' | 'join' | 'room'>('connect')
const playerName = ref('')
const joinCode = ref('')
const isConnecting = ref(false)

// ---- Colors ----
const allColors = Object.values(PlayerColor)

// ---- Computed ----
const roomId = computed(() => ws.roomState.value?.id ?? '')
const roomPlayers = computed(() => ws.roomState.value?.players ?? [])
const canStart = computed(() => {
  if (!ws.isHost.value) return false
  if (roomPlayers.value.length < 2) return false
  return roomPlayers.value.every((p) => p.ready || p.isHost)
})
const myPlayer = computed(() => ws.myRoomPlayer.value)
const amReady = computed(() => myPlayer.value?.ready ?? false)

// ---- Connection ----
const connectionError = ref('')

function handleCreateRoom() {
  if (!playerName.value.trim()) {
    connectionError.value = t('lobby.enterName')
    return
  }
  isConnecting.value = true
  connectionError.value = ''
  ws.connect()

  const checkConnected = setInterval(() => {
    if (ws.isConnected.value) {
      clearInterval(checkConnected)
      ws.createRoom(playerName.value.trim())
      isConnecting.value = false
    }
  }, 100)

  setTimeout(() => {
    clearInterval(checkConnected)
    if (!ws.isConnected.value) {
      isConnecting.value = false
      connectionError.value = t('lobby.connectionFailed')
    }
  }, 5000)
}

function handleJoinRoom() {
  if (!playerName.value.trim()) {
    connectionError.value = t('lobby.enterName')
    return
  }
  if (!joinCode.value.trim()) {
    connectionError.value = t('lobby.enterCode')
    return
  }
  isConnecting.value = true
  connectionError.value = ''
  ws.connect()

  const checkConnected = setInterval(() => {
    if (ws.isConnected.value) {
      clearInterval(checkConnected)
      ws.joinRoom(joinCode.value.trim().toUpperCase(), playerName.value.trim())
      isConnecting.value = false
    }
  }, 100)

  setTimeout(() => {
    clearInterval(checkConnected)
    if (!ws.isConnected.value) {
      isConnecting.value = false
      connectionError.value = t('lobby.connectionFailed')
    }
  }, 5000)
}

function handleLeave() {
  ws.leaveRoom()
  ws.disconnect()
  step.value = 'connect'
}

function goBack() {
  ws.disconnect()
  router.push('/')
}

// ---- Lobby Actions ----
function toggleReady() {
  ws.setReady(!amReady.value)
}

function selectColor(color: string) {
  ws.setColor(color)
}

function selectCharacter(index: number) {
  ws.setCharacter(index)
}

function isColorTaken(color: string): boolean {
  return roomPlayers.value.some(
    (p) => p.color === color && p.id !== ws.playerId.value
  )
}

function isCharacterTaken(index: number): boolean {
  return roomPlayers.value.some(
    (p) => p.characterIndex === index && p.id !== ws.playerId.value
  )
}

// ---- Start Game (Host only) ----
function handleStartGame() {
  if (!ws.isHost.value) return

  // Initialize game locally (host authority)
  const players = roomPlayers.value
  const config = { ...DEFAULT_GAME_CONFIG, playerCount: players.length }

  const gamePlayers: Player[] = players.map((rp, index) => ({
    id: rp.id,
    name: rp.name,
    color: (rp.color || allColors[index]) as PlayerColor,
    character: CHARACTERS[rp.characterIndex ?? index % CHARACTERS.length],
    isAwakened: false,
    money: config.startingMoney,
    hand: [],
    completedSlots: config.slotsPerPlayer,
    totalSlots: config.slotsPerPlayer,
    statusEffects: [],
    virusChipsPlaced: 0,
    positiveMinesTriggered: 0,
    completedSlotsData: 0,
  }))

  // Reset completedSlots to 0
  gamePlayers.forEach((p) => (p.completedSlots = 0))

  // Initialize chips
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
  for (const player of gamePlayers) {
    player.hand = shuffledChips.slice(chipIndex, chipIndex + config.startingHandSize)
    chipIndex += config.startingHandSize
  }

  const bagChips = shuffledChips.slice(chipIndex)

  // Board + mines
  boardStore.initializeBoard(config.boardRows, config.boardCols)
  const totalCells = config.boardRows * config.boardCols
  const mineTypes = generateMineCardDistribution(totalCells)

  gameStore.initializeGame({
    config,
    players: gamePlayers,
    chipBag: bagChips,
    mineTypes,
  })

  marketStore.initializeMarket(() => gameStore.drawChips(1))
  boardStore.initDraft(players.length)

  // Tell server to start game
  ws.startGame()

  // Broadcast state to all clients
  setTimeout(() => {
    ws.broadcastGameState()
    router.push('/draft')
  }, 100)
}

// ---- Listen for room state (auto-switch to room step) ----
function onRoomState() {
  if (ws.roomState.value && step.value === 'connect') {
    step.value = 'room'
  }
}

// ---- Listen for game_started from server (non-host clients) ----
function onGameAction(payload: Record<string, unknown>) {
  if (payload.action === 'game_started') {
    // Non-host: wait for state broadcast, then navigate
    if (!ws.isHost.value) {
      // State will be synced via GAME_STATE handler in useWebSocket
      setTimeout(() => {
        router.push('/draft')
      }, 500)
    }
  }
}

// ---- Listen for errors ----
function onError(payload: Record<string, unknown>) {
  connectionError.value = (payload.message as string) || 'Error'
  if (!ws.roomState.value) {
    step.value = 'connect'
  }
}

ws.on(ServerMsg.ROOM_STATE, onRoomState)
ws.on(ServerMsg.GAME_ACTION, onGameAction)
ws.on(ServerMsg.ERROR, onError)
onUnmounted(() => {
  ws.off(ServerMsg.ROOM_STATE, onRoomState)
  ws.off(ServerMsg.GAME_ACTION, onGameAction)
  ws.off(ServerMsg.ERROR, onError)
})
</script>

<template>
  <div class="lobby-view">
    <!-- Header -->
    <div class="lobby-header">
      <NeonButton variant="ghost" size="sm" @click="goBack">
        ← {{ t('setup.back') }}
      </NeonButton>
      <h1 class="lobby-title neon-text">{{ t('lobby.title') }}</h1>
      <LanguageToggle />
    </div>

    <!-- Step: Connect -->
    <div v-if="step === 'connect'" class="lobby-connect">
      <div class="connect-card">
        <label class="input-label">{{ t('lobby.enterName') }}</label>
        <input
          v-model="playerName"
          class="neon-input"
          :placeholder="t('lobby.enterName')"
          maxlength="12"
          @keyup.enter="handleCreateRoom"
        />

        <div class="connect-actions">
          <NeonButton size="lg" :disabled="!playerName.trim() || isConnecting" @click="handleCreateRoom">
            {{ isConnecting ? t('lobby.connecting') : t('lobby.createRoom') }}
          </NeonButton>

          <div class="divider-or">
            <span>OR</span>
          </div>

          <label class="input-label">{{ t('lobby.enterCode') }}</label>
          <input
            v-model="joinCode"
            class="neon-input code-input"
            :placeholder="'ABCD'"
            maxlength="4"
            @keyup.enter="handleJoinRoom"
          />
          <NeonButton
            variant="secondary"
            size="lg"
            :disabled="!playerName.trim() || !joinCode.trim() || isConnecting"
            @click="handleJoinRoom"
          >
            {{ isConnecting ? t('lobby.connecting') : t('lobby.joinRoom') }}
          </NeonButton>
        </div>

        <!-- Error Display -->
        <div v-if="connectionError || ws.lastError.value" class="error-message">
          {{ connectionError || ws.lastError.value }}
        </div>
      </div>
    </div>

    <!-- Step: Room -->
    <div v-if="step === 'room'" class="lobby-room">
      <!-- Room Code Display -->
      <div class="room-code-section">
        <span class="room-code-label">{{ t('lobby.roomCode') }}</span>
        <div class="room-code">{{ roomId }}</div>
        <span class="room-code-hint">{{ t('lobby.waiting') }}</span>
      </div>

      <!-- Player List -->
      <div class="room-players">
        <div
          v-for="rp in roomPlayers"
          :key="rp.id"
          class="room-player-card"
          :class="{ 'is-self': rp.id === ws.playerId.value }"
        >
          <div class="rp-header">
            <span
              class="rp-color-dot"
              :style="{ background: PLAYER_COLORS_CSS[rp.color] || '#888' }"
            />
            <span class="rp-name">{{ rp.name }}</span>
            <span v-if="rp.isHost" class="rp-host-badge">HOST</span>
            <span class="rp-ready" :class="{ active: rp.ready }">
              {{ rp.ready ? '✓' : '✗' }}
            </span>
          </div>
          <div class="rp-details">
            <span v-if="rp.characterIndex !== null" class="rp-character">
              {{ t(CHARACTERS[rp.characterIndex]?.nameKey || '') }}
            </span>
            <span v-else class="rp-no-char">—</span>
          </div>
        </div>
      </div>

      <!-- Self Controls -->
      <div v-if="myPlayer" class="self-controls">
        <!-- Color Selection -->
        <div class="control-section">
          <span class="control-label">{{ t('setup.selectColor') }}</span>
          <div class="color-options">
            <button
              v-for="color in allColors"
              :key="color"
              class="color-btn"
              :class="{
                active: myPlayer.color === color,
                disabled: isColorTaken(color),
              }"
              :style="{ background: PLAYER_COLORS_CSS[color] }"
              :disabled="isColorTaken(color)"
              @click="selectColor(color)"
            />
          </div>
        </div>

        <!-- Character Selection -->
        <div class="control-section">
          <span class="control-label">{{ t('setup.selectCharacter') }}</span>
          <div class="character-options">
            <button
              v-for="(char, ci) in CHARACTERS"
              :key="char.id"
              class="char-btn"
              :class="{
                active: myPlayer.characterIndex === ci,
                taken: isCharacterTaken(ci),
              }"
              :style="{ '--char-color': char.color }"
              :disabled="isCharacterTaken(ci)"
              @click="selectCharacter(ci)"
            >
              {{ t(char.nameKey) }}
            </button>
          </div>
        </div>

        <!-- Ready / Start -->
        <div class="room-actions">
          <NeonButton
            v-if="!ws.isHost.value"
            :variant="amReady ? 'secondary' : 'primary'"
            @click="toggleReady"
          >
            {{ amReady ? t('lobby.notReady') : t('lobby.ready') }}
          </NeonButton>

          <NeonButton
            v-if="ws.isHost.value"
            size="lg"
            :disabled="!canStart"
            @click="handleStartGame"
          >
            {{ t('lobby.startGame') }} →
          </NeonButton>

          <NeonButton variant="ghost" size="sm" @click="handleLeave">
            {{ t('lobby.leave') }}
          </NeonButton>
        </div>
      </div>

      <!-- Connection Status -->
      <div class="connection-status">
        <span class="status-dot" :class="{ connected: ws.isConnected.value }" />
        {{ ws.isConnected.value ? 'Connected' : 'Disconnected' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-view {
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

.lobby-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
}

.lobby-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  letter-spacing: 4px;
}

/* ---- Connect Step ---- */
.lobby-connect {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.connect-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-xl);
  background: var(--bg-surface);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: var(--border-radius-xl);
  min-width: 320px;
  max-width: 400px;
}

.input-label {
  font-family: var(--font-ui);
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.neon-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-dark);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 1rem;
  outline: none;
  transition: border-color var(--transition-normal);
}

.neon-input:focus {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.15);
}

.code-input {
  font-family: var(--font-display);
  font-size: 1.6rem;
  letter-spacing: 8px;
  text-align: center;
  text-transform: uppercase;
}

.connect-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.divider-or {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.divider-or::before,
.divider-or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.error-message {
  padding: 8px 12px;
  background: rgba(255, 45, 85, 0.1);
  border: 1px solid rgba(255, 45, 85, 0.3);
  border-radius: var(--border-radius-sm);
  color: var(--neon-red);
  font-size: 0.85rem;
}

/* ---- Room Step ---- */
.lobby-room {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.room-code-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.room-code-label {
  font-family: var(--font-ui);
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.room-code {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: 12px;
  color: var(--neon-cyan);
  text-shadow: 0 0 10px var(--neon-cyan), 0 0 20px var(--neon-cyan);
}

.room-code-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.6;
}

/* ---- Player List ---- */
.room-players {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

.room-player-card {
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--border-radius-lg);
  transition: border-color var(--transition-fast);
}

.room-player-card.is-self {
  border-color: rgba(0, 229, 255, 0.3);
}

.rp-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rp-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rp-name {
  flex: 1;
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.rp-host-badge {
  font-family: var(--font-display);
  font-size: 0.6rem;
  padding: 2px 6px;
  border: 1px solid var(--neon-cyan);
  border-radius: 4px;
  color: var(--neon-cyan);
  letter-spacing: 1px;
}

.rp-ready {
  font-size: 1rem;
  color: var(--text-secondary);
}

.rp-ready.active {
  color: var(--neon-green);
}

.rp-details {
  margin-top: 4px;
  padding-left: 20px;
}

.rp-character {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.rp-no-char {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.3;
}

/* ---- Self Controls ---- */
.self-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid rgba(0, 229, 255, 0.08);
  border-radius: var(--border-radius-xl);
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.color-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  opacity: 0.6;
}

.color-btn:hover:not(:disabled) {
  opacity: 1;
  transform: scale(1.15);
}

.color-btn.active {
  opacity: 1;
  border-color: white;
  transform: scale(1.2);
  box-shadow: 0 0 10px currentColor;
}

.color-btn.disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.character-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.char-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-sm);
  background: var(--bg-dark);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.char-btn:hover:not(:disabled) {
  border-color: var(--char-color);
}

.char-btn.active {
  border-color: var(--char-color);
  background: color-mix(in srgb, var(--char-color) 15%, var(--bg-dark));
  box-shadow: 0 0 8px color-mix(in srgb, var(--char-color) 30%, transparent);
}

.char-btn.taken {
  opacity: 0.2;
  cursor: not-allowed;
}

.room-actions {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  opacity: 0.5;
  justify-content: center;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--neon-red);
}

.status-dot.connected {
  background: var(--neon-green);
}

/* ---- Mobile ---- */
@media (max-width: 768px) {
  .lobby-view {
    padding: var(--space-md);
  }

  .lobby-title {
    font-size: 1.2rem;
    letter-spacing: 2px;
  }

  .connect-card {
    min-width: auto;
    max-width: 100%;
    padding: var(--space-lg);
  }

  .room-code {
    font-size: 2.2rem;
    letter-spacing: 8px;
  }

  .room-players {
    grid-template-columns: 1fr;
  }

  .self-controls {
    padding: var(--space-md);
  }

  .char-btn {
    padding: 4px 8px;
    font-size: 0.7rem;
  }

  .room-actions {
    flex-direction: column;
  }
}
</style>
