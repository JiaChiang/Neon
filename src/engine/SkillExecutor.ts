// ============================================================
// Neol Block - Skill Executor
// Handles character skill validation and execution for all
// 4 characters (basic + awakened = 8 skill variants).
// All functions are pure - no Pinia store imports.
// ============================================================

import type { Chip, Player } from '../types'
import { CharacterId, SubActionState } from '../types'

// ---- Result type returned by skill execution ----

export interface SkillResult {
  success: boolean
  description: string
  descriptionKey: string
  /** Whether the skill requires further UI interaction to complete */
  requiresInteraction?: boolean
  /** The sub-action state the UI should transition to */
  interactionType?: SubActionState
  /** Chips drawn as part of the skill effect */
  chipsDrawn?: Chip[]
  /** Money change (positive = gained, negative = spent) */
  moneyChanged?: number
  /** Market discount applied for this turn */
  marketDiscount?: number
  /** For awakened Recycler: reduction in chips needed to remove virus */
  virusRemovalCostReduction?: number
  /** For awakened Recycler: money bonus when removing a virus */
  virusRemovalBonus?: number
  /** For Hacker: revealed mine card positions */
  revealedMines?: { row: number; col: number; mineType: string }[]
  /** For Hacker awakened: passive flag for virus placement bonus */
  virusPlacementBonus?: number
  /** For Bio-Engineer awakened: passive flag for chip draw on slot completion */
  completionDrawBonus?: number
}

// ---- Context callbacks provided by the composable/view layer ----

export interface SkillContext {
  drawChips: (count: number) => Chip[]
  returnChipsToBag: (chips: Chip[]) => void
  addMoney: (playerId: string, amount: number) => void
  removeMoney: (playerId: string, amount: number) => void
  getPlayer: (playerId: string) => Player | undefined
  refreshMarket: () => void
  getFaceUpChips: () => (Chip | null)[]
  takeFreeMarketChip: (index: number) => Chip | null
  setMarketDiscount: (amount: number) => void
  /** Get unrevealed mine card positions on the board (for Hacker) */
  getUnrevealedMines?: () => { row: number; col: number; mineType: string }[]
}

// ---- Skill availability check ----

/**
 * Check if a player can use their skill this turn.
 * @param player     The player attempting to use the skill
 * @param skillCost  The money cost to activate the skill (from GameConfig)
 * @returns Whether the skill can be used, and a reason if not
 */
export function canUseSkill(
  player: Player,
  skillCost: number
): { canUse: boolean; reason?: string } {
  // Passive skills (Data Collector basic & awakened) are not actively used
  if (player.character.id === CharacterId.DATA_COLLECTOR) {
    return {
      canUse: false,
      reason: 'Data Collector skills are passive and activate automatically.',
    }
  }

  // Hacker awakened is passive (triggers on virus placement)
  if (player.character.id === CharacterId.HACKER && player.isAwakened) {
    return {
      canUse: false,
      reason: 'Neural Hijack is passive and activates when placing virus chips.',
    }
  }

  // Bio-Engineer awakened is passive (triggers on slot completion)
  if (player.character.id === CharacterId.BIO_ENGINEER && player.isAwakened) {
    return {
      canUse: false,
      reason: 'Bio-Feedback is passive and activates when completing slots.',
    }
  }

  // Check money
  if (player.money < skillCost) {
    return {
      canUse: false,
      reason: `Not enough money. Need $${skillCost}, have $${player.money}.`,
    }
  }

  return { canUse: true }
}

// ---- Skill execution ----

/**
 * Execute a character's skill (basic or awakened variant).
 * For interactive skills, returns requiresInteraction: true and the
 * sub-action state the UI should enter. The actual effect completes
 * when the UI interaction finishes.
 */
export function executeSkill(
  characterId: CharacterId,
  isAwakened: boolean,
  playerId: string,
  context: SkillContext
): SkillResult {
  switch (characterId) {
    // ================================================================
    // RECYCLER
    // ================================================================
    case CharacterId.RECYCLER:
      if (!isAwakened) {
        // Basic: Draw 3 from bag, player picks 1, return 2
        return executeRecyclerBasic(context)
      } else {
        // Awakened: Passive modifier for virus removal
        return executeRecyclerAwakened()
      }

    // ================================================================
    // DATA COLLECTOR
    // ================================================================
    case CharacterId.DATA_COLLECTOR:
      // Both basic and awakened are passive skills
      return {
        success: false,
        description: 'Data Collector skills are passive and cannot be activated manually.',
        descriptionKey: 'skill.dataCollector.passive',
      }

    // ================================================================
    // CONSTRUCTION BARON
    // ================================================================
    case CharacterId.CONSTRUCTION_BARON:
      if (!isAwakened) {
        return executeConstructionBaronBasic()
      } else {
        return executeConstructionBaronAwakened()
      }

    // ================================================================
    // FINANCIAL TYCOON
    // ================================================================
    case CharacterId.FINANCIAL_TYCOON:
      if (!isAwakened) {
        return executeFinancialTycoonBasic(context)
      } else {
        return executeFinancialTycoonAwakened(context)
      }

    // ================================================================
    // HACKER
    // ================================================================
    case CharacterId.HACKER:
      if (!isAwakened) {
        return executeHackerBasic(context)
      } else {
        // Awakened: Passive modifier for virus placement
        return executeHackerAwakened()
      }

    // ================================================================
    // BIO-ENGINEER
    // ================================================================
    case CharacterId.BIO_ENGINEER:
      if (!isAwakened) {
        return executeBioEngineerBasic(context)
      } else {
        // Awakened: Passive modifier for slot completion
        return executeBioEngineerAwakened()
      }

    default:
      return {
        success: false,
        description: 'Unknown character.',
        descriptionKey: 'skill.unknown',
      }
  }
}

// ---- Individual skill implementations ----

/**
 * Recycler Basic Skill: Draw 3 chips from the bag.
 * The player will pick 1 to keep (via UI interaction); the other 2 return to the bag.
 * Returns the 3 drawn chips so the UI can display the selection modal.
 */
function executeRecyclerBasic(context: SkillContext): SkillResult {
  const drawn = context.drawChips(3)

  if (drawn.length === 0) {
    return {
      success: false,
      description: 'No chips left in the bag to draw.',
      descriptionKey: 'skill.recycler.basic.empty',
    }
  }

  return {
    success: true,
    description: 'Draw 3 chips. Select 1 to keep, the rest return to the bag.',
    descriptionKey: 'skill.recycler.basic.drawn',
    requiresInteraction: true,
    interactionType: SubActionState.SELECT_KEEP,
    chipsDrawn: drawn,
  }
}

/**
 * Recycler Awakened Skill: Passive modifier for virus removal.
 * When removing a virus chip, only 1 sacrifice chip is needed (instead of 2),
 * and the player gains $5 as a bonus. The player can immediately place a
 * data chip on the freed slot.
 * This is a passive modifier, so it returns the modifier values for the
 * virus removal flow to check.
 */
function executeRecyclerAwakened(): SkillResult {
  return {
    success: true,
    description: 'Purification Master: Virus removal costs only 1 chip instead of 2, and you gain $5.',
    descriptionKey: 'skill.recycler.awakened.active',
    virusRemovalCostReduction: 1,
    virusRemovalBonus: 5,
  }
}

/**
 * Construction Baron Basic Skill: Move 1 of your chips on the board
 * to an adjacent empty slot.
 * Requires UI interaction: player selects a chip on the board,
 * then selects an adjacent empty cell to move it to.
 */
function executeConstructionBaronBasic(): SkillResult {
  return {
    success: true,
    description: 'Select one of your chips on the board to move to an adjacent empty slot.',
    descriptionKey: 'skill.constructionBaron.basic.select',
    requiresInteraction: true,
    interactionType: SubActionState.SELECT_BOARD_CHIP,
  }
}

/**
 * Construction Baron Awakened Skill: Swap the positions of 2 of your
 * non-virus chips on the board.
 * Requires UI interaction: player selects 2 chips to swap.
 */
function executeConstructionBaronAwakened(): SkillResult {
  return {
    success: true,
    description: 'Select 2 of your non-virus chips on the board to swap positions.',
    descriptionKey: 'skill.constructionBaron.awakened.select',
    requiresInteraction: true,
    interactionType: SubActionState.SELECT_BOARD_CHIP,
  }
}

/**
 * Financial Tycoon Basic Skill: Market purchases cost $3 less this turn.
 * Applies a discount that lasts until end of turn.
 */
function executeFinancialTycoonBasic(context: SkillContext): SkillResult {
  context.setMarketDiscount(3)
  return {
    success: true,
    description: 'Capital Advantage: Market purchases cost $3 less this turn.',
    descriptionKey: 'skill.financialTycoon.basic.active',
    marketDiscount: 3,
  }
}

/**
 * Financial Tycoon Awakened Skill: Refresh the market (discard all
 * face-up chips, draw new ones), then take 1 face-up chip for free.
 * Requires UI interaction for chip selection.
 */
function executeFinancialTycoonAwakened(context: SkillContext): SkillResult {
  context.refreshMarket()
  return {
    success: true,
    description: 'Market Manipulation: Market refreshed. Select 1 face-up chip to take for free.',
    descriptionKey: 'skill.financialTycoon.awakened.select',
    requiresInteraction: true,
    interactionType: SubActionState.SELECT_MARKET_SLOT,
  }
}

// ---- Hacker Skills ----

/**
 * Hacker Basic Skill: Peek at up to 3 unrevealed mine cards on the board.
 * This reveals the mine types to the current player only (information advantage).
 * Non-interactive — the result contains the revealed mine positions.
 */
function executeHackerBasic(context: SkillContext): SkillResult {
  if (!context.getUnrevealedMines) {
    return {
      success: false,
      description: 'Cannot peek at mines — feature not available.',
      descriptionKey: 'skill.hacker.basic.unavailable',
    }
  }

  const unrevealed = context.getUnrevealedMines()
  if (unrevealed.length === 0) {
    return {
      success: true,
      description: 'System Intrusion: No unrevealed mines remaining on the board.',
      descriptionKey: 'skill.hacker.basic.empty',
    }
  }

  // Randomly select up to 3 mines to reveal
  const shuffled = [...unrevealed].sort(() => Math.random() - 0.5)
  const revealed = shuffled.slice(0, 3)

  return {
    success: true,
    description: `System Intrusion: Peeked at ${revealed.length} mine card(s)!`,
    descriptionKey: 'skill.hacker.basic.peeked',
    revealedMines: revealed,
  }
}

/**
 * Hacker Awakened Skill: Passive modifier.
 * When placing a virus chip on an opponent's slot, steal $3 from that opponent.
 * This is a passive modifier checked during chip placement.
 */
function executeHackerAwakened(): SkillResult {
  return {
    success: true,
    description: 'Neural Hijack active: When placing virus on opponent, steal $3 from them.',
    descriptionKey: 'skill.hacker.awakened.active',
    virusPlacementBonus: 3,
  }
}

// ---- Bio-Engineer Skills ----

/**
 * Bio-Engineer Basic Skill: Draw 2 chips from the bag.
 * Player picks 1 to keep, returns 1 to the bag.
 * Similar to Recycler but draws fewer chips (2 instead of 3).
 */
function executeBioEngineerBasic(context: SkillContext): SkillResult {
  const drawn = context.drawChips(2)

  if (drawn.length === 0) {
    return {
      success: false,
      description: 'No chips left in the bag to draw.',
      descriptionKey: 'skill.bioEngineer.basic.empty',
    }
  }

  // If only 1 chip drawn, auto-keep it
  if (drawn.length === 1) {
    return {
      success: true,
      description: 'Gene Synthesis: Only 1 chip available — added to hand.',
      descriptionKey: 'skill.bioEngineer.basic.single',
      chipsDrawn: drawn,
    }
  }

  return {
    success: true,
    description: 'Gene Synthesis: Draw 2 chips. Select 1 to keep, return the other.',
    descriptionKey: 'skill.bioEngineer.basic.drawn',
    requiresInteraction: true,
    interactionType: SubActionState.SELECT_KEEP,
    chipsDrawn: drawn,
  }
}

/**
 * Bio-Engineer Awakened Skill: Passive modifier.
 * When completing a slot (own slot + data chip), immediately draw 1 bonus chip
 * from the bag to hand. Checked during chip placement.
 */
function executeBioEngineerAwakened(): SkillResult {
  return {
    success: true,
    description: 'Bio-Feedback active: Draw 1 bonus chip when completing a slot.',
    descriptionKey: 'skill.bioEngineer.awakened.active',
    completionDrawBonus: 1,
  }
}
