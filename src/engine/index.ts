// ============================================================
// Neol Block - Engine Barrel Export
// Re-exports all engine modules for convenient importing.
// ============================================================

export { ChipBag } from './ChipBag'

export {
  createMineCards,
  executeMineEffect,
  executeDelayedMineEffect,
} from './MineCardLogic'
export type { MineEffectResult, MineEffectContext } from './MineCardLogic'

export {
  canUseSkill,
  executeSkill,
} from './SkillExecutor'
export type { SkillResult, SkillContext } from './SkillExecutor'

export {
  checkVictoryTrigger,
  checkResourceExhaustion,
  calculateFinalRankings,
} from './VictoryChecker'
