import type { GameConfig } from '../types'

export const DEFAULT_GAME_CONFIG: GameConfig = {
  playerCount: 2,
  boardRows: 8,
  boardCols: 9,
  slotsPerPlayer: 10,
  startingMoney: 15,
  startingHandSize: 3,
  dataChipCount: 60,
  virusChipCount: 12,
  skillCost: 2,
  virusRemovalCost: 2,
  completionBonus: 1,
  winSlotCount: 6,
  awakenSlotCount: 4,
}

export const MARKET_FACE_UP_PRICES = [3, 3, 4]
export const MARKET_BLIND_PRICE = 2
export const MARKET_DISCARD_PRICE = 6
export const MARKET_FACE_UP_COUNT = 3

export const PLAYER_COLORS_CSS: Record<string, string> = {
  RED: '#ff2d55',
  ORANGE: '#ff9500',
  YELLOW: '#ffcc00',
  GREEN: '#30d158',
  BLUE: '#0a84ff',
  PURPLE: '#bf5af2',
}

export const PLAYER_COLOR_NAMES_ZH: Record<string, string> = {
  RED: '紅色',
  ORANGE: '橙色',
  YELLOW: '黃色',
  GREEN: '綠色',
  BLUE: '藍色',
  PURPLE: '紫色',
}

export const PLAYER_COLOR_NAMES_EN: Record<string, string> = {
  RED: 'Red',
  ORANGE: 'Orange',
  YELLOW: 'Yellow',
  GREEN: 'Green',
  BLUE: 'Blue',
  PURPLE: 'Purple',
}

export const DRAFT_SLOTS_PER_TURN = 2
