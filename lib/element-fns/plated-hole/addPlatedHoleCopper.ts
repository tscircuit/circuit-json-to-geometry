import type { Polygon } from "@flatten-js/core"
import Flatten from "@flatten-js/core"
import type { PcbPlatedHole, Point } from "circuit-json"

import { ensureLayerBucket, type LayerBuckets } from "../../layers/layerBuckets"
import {
  createRectPolygon,
  circleToPolygon,
  polygonFromPoints,
} from "../../helpers/polygons"
import { isFiniteNumber } from "../../helpers/isFiniteNumber"

export const addPlatedHoleCopper = (
  hole: PcbPlatedHole,
  origin: { x: number; y: number },
  copperByLayer: LayerBuckets,
) => {
  const layers: string[] = []

  if (Array.isArray((hole as any).layers) && (hole as any).layers.length > 0) {
    for (const l of (hole as any).layers) {
      if (typeof l === "string") layers.push(l)
    }
  } else if (typeof (hole as any).layer === "string") {
    layers.push((hole as any).layer)
  } else {
    layers.push("top")
  }

  const cx = hole.x + origin.x
  const cy = hole.y + origin.y

  const shape = (hole as any).shape as string | undefined
  if (!shape) return

  const pushToLayers = (poly: Polygon) => {
    for (const layer of layers) {
      const bucket = ensureLayerBucket(copperByLayer, layer)
      bucket.push(poly)
    }
  }

  switch (shape) {
    case "circle": {
      const outerDiameter = (hole as any).outer_diameter
      if (!isFiniteNumber(outerDiameter)) return
      const radius = outerDiameter / 2
      const circle = new Flatten.Circle(new Flatten.Point(cx, cy), radius)
      const poly = circleToPolygon(circle, 64)
      pushToLayers(poly)
      break
    }

    case "oval": {
      const outerWidth = (hole as any).outer_width
      const outerHeight = (hole as any).outer_height
      if (!isFiniteNumber(outerWidth) || !isFiniteNumber(outerHeight)) return
      const rotation = (hole as any).ccw_rotation ?? 0
      const poly = createRectPolygon(cx, cy, outerWidth, outerHeight, rotation)
      pushToLayers(poly)
      break
    }

    case "pill": {
      const outerWidth = (hole as any).outer_width
      const outerHeight = (hole as any).outer_height
      if (!isFiniteNumber(outerWidth) || !isFiniteNumber(outerHeight)) return
      const rotation = (hole as any).ccw_rotation ?? 0
      const poly = createRectPolygon(cx, cy, outerWidth, outerHeight, rotation)
      pushToLayers(poly)
      break
    }

    case "circular_hole_with_rect_pad":
    case "pill_hole_with_rect_pad":
    case "rotated_pill_hole_with_rect_pad": {
      const rectWidth = (hole as any).rect_pad_width
      const rectHeight = (hole as any).rect_pad_height
      if (!isFiniteNumber(rectWidth) || !isFiniteNumber(rectHeight)) return

      const holeWithPad = hole as unknown as {
        rect_pad_width: number
        rect_pad_height: number
        hole_offset_x?: number
        hole_offset_y?: number
        rect_ccw_rotation?: number
      }

      const rotation = holeWithPad.rect_ccw_rotation ?? 0
      const rectCenterX = cx + (holeWithPad.hole_offset_x ?? 0)
      const rectCenterY = cy + (holeWithPad.hole_offset_y ?? 0)

      const poly = createRectPolygon(
        rectCenterX,
        rectCenterY,
        rectWidth,
        rectHeight,
        rotation,
      )
      pushToLayers(poly)
      break
    }

    case "hole_with_polygon_pad": {
      const padOutline = (hole as any).pad_outline as Point[] | undefined
      if (!padOutline || padOutline.length < 3) return
      const poly = polygonFromPoints(padOutline, origin)
      pushToLayers(poly)
      break
    }

    default: {
      console.warn(`Unknown plated hole shape: ${(hole as any).shape}`)
    }
  }
}
