import { CharacterId } from '../types/enums'
import type { Character } from '../types/game'

export const CHARACTERS: Character[] = [
  {
    id: CharacterId.RECYCLER,
    nameKey: 'character.recycler.name',
    titleKey: 'character.recycler.title',
    basicSkillKey: 'character.recycler.basicSkill',
    basicDescKey: 'character.recycler.basicDesc',
    awakenSkillKey: 'character.recycler.awakenSkill',
    awakenDescKey: 'character.recycler.awakenDesc',
    color: '#30d158',
  },
  {
    id: CharacterId.DATA_COLLECTOR,
    nameKey: 'character.dataCollector.name',
    titleKey: 'character.dataCollector.title',
    basicSkillKey: 'character.dataCollector.basicSkill',
    basicDescKey: 'character.dataCollector.basicDesc',
    awakenSkillKey: 'character.dataCollector.awakenSkill',
    awakenDescKey: 'character.dataCollector.awakenDesc',
    color: '#0a84ff',
  },
  {
    id: CharacterId.CONSTRUCTION_BARON,
    nameKey: 'character.constructionBaron.name',
    titleKey: 'character.constructionBaron.title',
    basicSkillKey: 'character.constructionBaron.basicSkill',
    basicDescKey: 'character.constructionBaron.basicDesc',
    awakenSkillKey: 'character.constructionBaron.awakenSkill',
    awakenDescKey: 'character.constructionBaron.awakenDesc',
    color: '#ff9500',
  },
  {
    id: CharacterId.FINANCIAL_TYCOON,
    nameKey: 'character.financialTycoon.name',
    titleKey: 'character.financialTycoon.title',
    basicSkillKey: 'character.financialTycoon.basicSkill',
    basicDescKey: 'character.financialTycoon.basicDesc',
    awakenSkillKey: 'character.financialTycoon.awakenSkill',
    awakenDescKey: 'character.financialTycoon.awakenDesc',
    color: '#ffcc00',
  },
]
