import type { PcbBoard, PcbPanel, Point } from "circuit-json"
import { Polygon, point } from "@flatten-js/core"

import { isFiniteNumber } from "../../helpers/isFiniteNumber"
import { polygonFromPoints } from "../../helpers/polygons"

export const boardLikeToPolygon = (
  board: PcbBoard | PcbPanel,
  origin: { x: number; y: number },
): Polygon | undefined => {
  if ((board as any).outline && Array.isArray((board as any).outline)) {
    const outline = (board as any).outline as Point[]
    if (outline.length >= 3) {
      return polygonFromPoints(outline, origin)
    }
  }

  if (
    isFiniteNumber((board as any).width) &&
    isFiniteNumber((board as any).height) &&
    (board as any).center &&
    isFiniteNumber((board as any).center.x) &&
    isFiniteNumber((board as any).center.y)
  ) {
    const width = (board as any).width as number
    const height = (board as any).height as number
    const center = (board as any).center as Point

    const halfWidth = width / 2
    const halfHeight = height / 2

    const minX = center.x - halfWidth + origin.x
    const minY = center.y - halfHeight + origin.y
    const maxX = center.x + halfWidth + origin.x
    const maxY = center.y + halfHeight + origin.y

    return new Polygon([
      point(minX, minY),
      point(maxX, minY),
      point(maxX, maxY),
      point(minX, maxY),
    ])
  }

  return undefined
}
