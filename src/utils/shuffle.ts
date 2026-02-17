/**
 * Fisher-Yates shuffle - shuffles array in place
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Generate a unique ID
 */
let idCounter = 0
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${idCounter++}`
}
