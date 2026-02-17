// ============================================================
// Neol Block - Enumerations
// ============================================================

export enum GamePhase {
  MENU = 'MENU',
  SETUP = 'SETUP',
  DRAFT = 'DRAFT',
  PLAYING = 'PLAYING',
  FINAL_ROUND = 'FINAL_ROUND',
  GAME_OVER = 'GAME_OVER',
}

export enum TurnPhase {
  TURN_START = 'TURN_START',
  SKILL_PHASE = 'SKILL_PHASE',
  MAIN_ACTION = 'MAIN_ACTION',
  END_RESOLUTION = 'END_RESOLUTION',
  TURN_END = 'TURN_END',
}

export enum ActionType {
  CHIP_INSTALL = 'CHIP_INSTALL',
  CHIP_RECYCLE = 'CHIP_RECYCLE',
  MARKET_PURCHASE = 'MARKET_PURCHASE',
}

export enum SubActionState {
  // Chip Install flow
  SELECT_CHIP = 'SELECT_CHIP',
  SELECT_CELL = 'SELECT_CELL',
  RESOLVE_MINE = 'RESOLVE_MINE',
  RESOLVE_EFFECT = 'RESOLVE_EFFECT',

  // Chip Recycle flow
  SELECT_DISCARD = 'SELECT_DISCARD',
  DRAW_CHIPS = 'DRAW_CHIPS',
  SELECT_KEEP = 'SELECT_KEEP',

  // Market Purchase flow
  SELECT_MARKET_SLOT = 'SELECT_MARKET_SLOT',

  // Virus Removal
  SELECT_VIRUS_TARGET = 'SELECT_VIRUS_TARGET',
  SELECT_SACRIFICE_CHIPS = 'SELECT_SACRIFICE_CHIPS',

  // Skill sub-actions
  SELECT_TARGET_PLAYER = 'SELECT_TARGET_PLAYER',
  SELECT_BOARD_CHIP = 'SELECT_BOARD_CHIP',
  SELECT_BOARD_CELL = 'SELECT_BOARD_CELL',

  // Waiting for confirmation
  AWAITING_CONFIRM = 'AWAITING_CONFIRM',
}

export enum ChipType {
  DATA = 'DATA',
  VIRUS = 'VIRUS',
}

export enum PlayerColor {
  RED = 'RED',
  ORANGE = 'ORANGE',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  PURPLE = 'PURPLE',
}

export enum MineCardType {
  BLANK = 'BLANK',
  // Positive - Immediate
  CORE_OVERCLOCK = 'CORE_OVERCLOCK',
  FIREWALL_PATCH = 'FIREWALL_PATCH',
  DATA_MINING = 'DATA_MINING',
  UNIVERSAL_PORT = 'UNIVERSAL_PORT',
  // Negative - Immediate
  CHAIN_SHORT_CIRCUIT = 'CHAIN_SHORT_CIRCUIT',
  ASSET_FREEZE = 'ASSET_FREEZE',
  // Delayed
  CODE_SHIFT = 'CODE_SHIFT',
  TROJAN_HORSE = 'TROJAN_HORSE',
  MIRROR_PATH = 'MIRROR_PATH',
  RESTART_COMMAND = 'RESTART_COMMAND',
  EMERGENCY_BACKUP = 'EMERGENCY_BACKUP',
}

export enum MineEffectTiming {
  IMMEDIATE = 'IMMEDIATE',
  DELAYED = 'DELAYED',
  NONE = 'NONE',
}

export enum CharacterId {
  RECYCLER = 'RECYCLER',
  DATA_COLLECTOR = 'DATA_COLLECTOR',
  CONSTRUCTION_BARON = 'CONSTRUCTION_BARON',
  FINANCIAL_TYCOON = 'FINANCIAL_TYCOON',
}

export enum ModalType {
  TARGET_PLAYER = 'TARGET_PLAYER',
  CHIP_SELECT = 'CHIP_SELECT',
  CELL_SELECT = 'CELL_SELECT',
  CONFIRM = 'CONFIRM',
  MINE_REVEAL = 'MINE_REVEAL',
  DISCARD_PILE = 'DISCARD_PILE',
  PASS_DEVICE = 'PASS_DEVICE',
  CHIP_RECYCLE_SELECT = 'CHIP_RECYCLE_SELECT',
}

export enum StatusEffect {
  ASSET_FREEZE = 'ASSET_FREEZE', // Cannot use market next turn
  SKILL_BLOCKED = 'SKILL_BLOCKED', // Cannot use skill this turn
  MIRROR_PATH = 'MIRROR_PATH', // Must place on opponent's slot
}
