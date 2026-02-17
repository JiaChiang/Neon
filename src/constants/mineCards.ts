import { MineCardType, MineEffectTiming } from '../types/enums'

export interface MineCardDefinition {
  type: MineCardType
  timing: MineEffectTiming
  nameKey: string
  descKey: string
  emoji: string
  isPositive: boolean | null // null = blank
}

export const MINE_CARD_DEFINITIONS: Record<MineCardType, MineCardDefinition> = {
  [MineCardType.BLANK]: {
    type: MineCardType.BLANK,
    timing: MineEffectTiming.NONE,
    nameKey: 'mine.blank.name',
    descKey: 'mine.blank.desc',
    emoji: '📄',
    isPositive: null,
  },
  // ---- Positive - Immediate ----
  [MineCardType.CORE_OVERCLOCK]: {
    type: MineCardType.CORE_OVERCLOCK,
    timing: MineEffectTiming.IMMEDIATE,
    nameKey: 'mine.coreOverclock.name',
    descKey: 'mine.coreOverclock.desc',
    emoji: '⚡',
    isPositive: true,
  },
  [MineCardType.FIREWALL_PATCH]: {
    type: MineCardType.FIREWALL_PATCH,
    timing: MineEffectTiming.IMMEDIATE,
    nameKey: 'mine.firewallPatch.name',
    descKey: 'mine.firewallPatch.desc',
    emoji: '🛡️',
    isPositive: true,
  },
  [MineCardType.DATA_MINING]: {
    type: MineCardType.DATA_MINING,
    timing: MineEffectTiming.IMMEDIATE,
    nameKey: 'mine.dataMining.name',
    descKey: 'mine.dataMining.desc',
    emoji: '💎',
    isPositive: true,
  },
  [MineCardType.UNIVERSAL_PORT]: {
    type: MineCardType.UNIVERSAL_PORT,
    timing: MineEffectTiming.IMMEDIATE,
    nameKey: 'mine.universalPort.name',
    descKey: 'mine.universalPort.desc',
    emoji: '🔌',
    isPositive: true,
  },
  // ---- Negative - Immediate ----
  [MineCardType.CHAIN_SHORT_CIRCUIT]: {
    type: MineCardType.CHAIN_SHORT_CIRCUIT,
    timing: MineEffectTiming.IMMEDIATE,
    nameKey: 'mine.chainShortCircuit.name',
    descKey: 'mine.chainShortCircuit.desc',
    emoji: '💥',
    isPositive: false,
  },
  [MineCardType.ASSET_FREEZE]: {
    type: MineCardType.ASSET_FREEZE,
    timing: MineEffectTiming.IMMEDIATE,
    nameKey: 'mine.assetFreeze.name',
    descKey: 'mine.assetFreeze.desc',
    emoji: '🧊',
    isPositive: false,
  },
  // ---- Delayed ----
  [MineCardType.CODE_SHIFT]: {
    type: MineCardType.CODE_SHIFT,
    timing: MineEffectTiming.DELAYED,
    nameKey: 'mine.codeShift.name',
    descKey: 'mine.codeShift.desc',
    emoji: '🔄',
    isPositive: true,
  },
  [MineCardType.TROJAN_HORSE]: {
    type: MineCardType.TROJAN_HORSE,
    timing: MineEffectTiming.DELAYED,
    nameKey: 'mine.trojanHorse.name',
    descKey: 'mine.trojanHorse.desc',
    emoji: '🐴',
    isPositive: false,
  },
  [MineCardType.MIRROR_PATH]: {
    type: MineCardType.MIRROR_PATH,
    timing: MineEffectTiming.DELAYED,
    nameKey: 'mine.mirrorPath.name',
    descKey: 'mine.mirrorPath.desc',
    emoji: '🪞',
    isPositive: false,
  },
  [MineCardType.RESTART_COMMAND]: {
    type: MineCardType.RESTART_COMMAND,
    timing: MineEffectTiming.DELAYED,
    nameKey: 'mine.restartCommand.name',
    descKey: 'mine.restartCommand.desc',
    emoji: '🔁',
    isPositive: true,
  },
  [MineCardType.EMERGENCY_BACKUP]: {
    type: MineCardType.EMERGENCY_BACKUP,
    timing: MineEffectTiming.DELAYED,
    nameKey: 'mine.emergencyBackup.name',
    descKey: 'mine.emergencyBackup.desc',
    emoji: '💾',
    isPositive: true,
  },
}

// Mine card distribution for a given total cell count
// 62% blank, rest distributed among effect cards
export function generateMineCardDistribution(totalCells: number): MineCardType[] {
  const blankCount = Math.floor(totalCells * 0.62)
  const effectCount = totalCells - blankCount

  // Effect card distribution (roughly equal, with some variety)
  const effectTypes: MineCardType[] = [
    MineCardType.CORE_OVERCLOCK,
    MineCardType.FIREWALL_PATCH,
    MineCardType.DATA_MINING,
    MineCardType.UNIVERSAL_PORT,
    MineCardType.CHAIN_SHORT_CIRCUIT,
    MineCardType.ASSET_FREEZE,
    MineCardType.CODE_SHIFT,
    MineCardType.TROJAN_HORSE,
    MineCardType.MIRROR_PATH,
    MineCardType.RESTART_COMMAND,
    MineCardType.EMERGENCY_BACKUP,
  ]

  const distribution: MineCardType[] = []

  // Add blanks
  for (let i = 0; i < blankCount; i++) {
    distribution.push(MineCardType.BLANK)
  }

  // Distribute effect cards evenly, then fill remaining randomly
  const perType = Math.floor(effectCount / effectTypes.length)
  let remaining = effectCount - perType * effectTypes.length

  for (const type of effectTypes) {
    const count = perType + (remaining > 0 ? 1 : 0)
    if (remaining > 0) remaining--
    for (let i = 0; i < count; i++) {
      distribution.push(type)
    }
  }

  return distribution
}
