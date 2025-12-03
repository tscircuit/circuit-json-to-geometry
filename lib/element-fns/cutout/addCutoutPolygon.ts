import type { Polygon } from "@flatten-js/core"
import type { PcbCutout, Point } from "circuit-json"
import Flatten from "@flatten-js/core"

import {
  createRectPolygon,
  circleToPolygon,
  polygonFromPoints,
} from "../../helpers/polygons"
import { isFiniteNumber } from "../../helpers/isFiniteNumber"

export const addCutoutPolygon = (
  cutout: PcbCutout,
  origin: { x: number; y: number },
  target: Polygon[],
) => {
  const shape = (cutout as any).shape as string | undefined
  if (!shape) return

  if (shape === "rect") {
    const rect = cutout as any as {
      center: Point
      width: number
      height: number
      rotation?: number
    }

    if (
      !rect.center ||
      !isFiniteNumber(rect.center.x) ||
      !isFiniteNumber(rect.center.y) ||
      !isFiniteNumber(rect.width) ||
      !isFiniteNumber(rect.height)
    ) {
      return
    }

    const cx = rect.center.x + origin.x
    const cy = rect.center.y + origin.y
    const rotationDeg = rect.rotation ?? 0
    target.push(createRectPolygon(cx, cy, rect.width, rect.height, rotationDeg))
    return
  }

  if (shape === "circle") {
    const circleCutout = cutout as any as {
      center: Point
      radius?: number
      diameter?: number
    }

    if (!circleCutout.center) return
    const { center } = circleCutout
    if (!isFiniteNumber(center.x) || !isFiniteNumber(center.y)) return

    const radius =
      (isFiniteNumber(circleCutout.radius) && circleCutout.radius) ||
      (isFiniteNumber(circleCutout.diameter) && circleCutout.diameter! / 2) ||
      undefined

    if (!radius) return

    const circle = new Flatten.Circle(
      new Flatten.Point(center.x + origin.x, center.y + origin.y),
      radius,
    )
    target.push(circleToPolygon(circle, 64))
    return
  }

  if (shape === "polygon") {
    const polygonCutout = cutout as any as {
      points?: Point[]
    }

    if (!polygonCutout.points || polygonCutout.points.length < 3) return
    target.push(polygonFromPoints(polygonCutout.points, origin))
  }
}
