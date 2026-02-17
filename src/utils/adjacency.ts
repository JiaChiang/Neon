import type { CellCoord } from '../types'

/**
 * Get adjacent cells (up, down, left, right) for a given coordinate
 */
export function getAdjacentCoords(
  row: number,
  col: number,
  maxRows: number,
  maxCols: number
): CellCoord[] {
  const directions: CellCoord[] = [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ]

  return directions.filter(
    (c) => c.row >= 0 && c.row < maxRows && c.col >= 0 && c.col < maxCols
  )
}

/**
 * Check if two coordinates are adjacent
 */
export function isAdjacent(a: CellCoord, b: CellCoord): boolean {
  const dr = Math.abs(a.row - b.row)
  const dc = Math.abs(a.col - b.col)
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1)
}
