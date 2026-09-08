import Flatten, { Box } from "@flatten-js/core"
import type { PcbSmtPad, Point } from "circuit-json"
import { isFiniteNumber } from "../../helpers/isFiniteNumber"
import {
  circleToPolygon,
  createRectPolygon,
  polygonFromPoints,
} from "../../helpers/polygons"
import type { LayerBuckets } from "../../layers/layerBuckets"
import { ensureLayerBucket } from "../../layers/layerBuckets"

const padLayer = (smtPad: PcbSmtPad): string =>
  ((smtPad as { layer?: string }).layer as string) ?? "top"

export const addSmtPadCopper = (
  smtPad: PcbSmtPad,
  origin: { x: number; y: number },
  copperByLayer: LayerBuckets,
) => {
  const layer = padLayer(smtPad)
  const bucket = ensureLayerBucket(copperByLayer, layer)

  switch (smtPad.shape) {
    case "rect": {
      if (
        !isFiniteNumber(smtPad.x) ||
        !isFiniteNumber(smtPad.y) ||
        !isFiniteNumber(smtPad.width) ||
        !isFiniteNumber(smtPad.height)
      ) {
        return
      }

      const centerX = smtPad.x + origin.x
      const centerY = smtPad.y + origin.y
      const halfWidth = smtPad.width / 2
      const halfHeight = smtPad.height / 2

      bucket.push(
        new Box(
          centerX - halfWidth,
          centerY - halfHeight,
          centerX + halfWidth,
          centerY + halfHeight,
        ),
      )
      return
    }

    case "rotated_rect": {
      if (
        !isFiniteNumber(smtPad.x) ||
        !isFiniteNumber(smtPad.y) ||
        !isFiniteNumber(smtPad.width) ||
        !isFiniteNumber(smtPad.height)
      ) {
        return
      }
      bucket.push(
        createRectPolygon(
          smtPad.x + origin.x,
          smtPad.y + origin.y,
          smtPad.width,
          smtPad.height,
          smtPad.ccw_rotation ?? 0,
        ),
      )
      return
    }

    case "circle": {
      if (
        !isFiniteNumber(smtPad.x) ||
        !isFiniteNumber(smtPad.y) ||
        !isFiniteNumber(smtPad.radius)
      ) {
        return
      }
      const circle = new Flatten.Circle(
        new Flatten.Point(smtPad.x + origin.x, smtPad.y + origin.y),
        smtPad.radius,
      )
      bucket.push(circleToPolygon(circle, 64))
      return
    }

    case "pill":
    case "rotated_pill": {
      if (
        !isFiniteNumber(smtPad.x) ||
        !isFiniteNumber(smtPad.y) ||
        !isFiniteNumber(smtPad.width) ||
        !isFiniteNumber(smtPad.height)
      ) {
        return
      }
      const rotation =
        smtPad.shape === "rotated_pill" ? (smtPad.ccw_rotation ?? 0) : 0
      bucket.push(
        createRectPolygon(
          smtPad.x + origin.x,
          smtPad.y + origin.y,
          smtPad.width,
          smtPad.height,
          rotation,
        ),
      )
      return
    }

    case "polygon": {
      const points = (smtPad as { points?: Point[] }).points
      if (!points || points.length < 3) return
      bucket.push(polygonFromPoints(points, origin))
      return
    }

    default:
      return
  }
}
