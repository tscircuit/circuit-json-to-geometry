import Flatten, { BooleanOperations, Polygon } from "@flatten-js/core"
import type { PcbTrace } from "circuit-json"

import { DEFAULT_TRACE_WIDTH } from "../../constants"
import type { LayerBuckets } from "../../layers/layerBuckets"
import { ensureLayerBucket } from "../../layers/layerBuckets"
import { circleToPolygon } from "../../helpers/polygons"
import { isFiniteNumber } from "../../helpers/isFiniteNumber"

export const addPcbTraceCopper = (
  trace: PcbTrace,
  origin: { x: number; y: number },
  copperByLayer: LayerBuckets,
) => {
  const route = trace.route
  if (!route || route.length < 2) return

  const defaultWidth =
    (route.find((point) => (point as any).route_type === "wire") as any)
      ?.width ?? DEFAULT_TRACE_WIDTH

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i]
    const end = route[i + 1]
    if (!start || !end) continue

    const layer =
      ("layer" in start && (start as any).layer) ||
      ("layer" in end && (end as any).layer) ||
      null

    if (!layer) continue

    const width =
      ("width" in start && isFiniteNumber((start as any).width)
        ? (start as any).width
        : "width" in end && isFiniteNumber((end as any).width)
          ? (end as any).width
          : defaultWidth) ?? DEFAULT_TRACE_WIDTH

    const bucket = ensureLayerBucket(copperByLayer, layer as string)

    const polygons: Polygon[] = []

    const endpoints = [start, end]
    for (const pt of endpoints) {
      if (!pt) continue
      const circle = new Flatten.Circle(
        new Flatten.Point(pt.x + origin.x, pt.y + origin.y),
        width / 2,
      )
      polygons.push(circleToPolygon(circle))
    }

    const dx = end.x - start.x
    const dy = end.y - start.y
    const segmentLength = Math.hypot(dx, dy)
    if (segmentLength > 0) {
      const centerX = (start.x + end.x) / 2 + origin.x
      const centerY = (start.y + end.y) / 2 + origin.y
      const rotationDeg = (Math.atan2(dy, dx) * 180) / Math.PI

      const w2 = segmentLength / 2
      const h2 = width / 2

      const angleRad = (rotationDeg * Math.PI) / 180
      const cosAngle = Math.cos(angleRad)
      const sinAngle = Math.sin(angleRad)

      const corners = [
        { x: -w2, y: -h2 },
        { x: w2, y: -h2 },
        { x: w2, y: h2 },
        { x: -w2, y: h2 },
      ]

      const rotatedCorners = corners.map((p) => ({
        x: centerX + p.x * cosAngle - p.y * sinAngle,
        y: centerY + p.x * sinAngle + p.y * cosAngle,
      }))

      polygons.push(
        new Flatten.Polygon(rotatedCorners.map((p) => Flatten.point(p.x, p.y))),
      )
    }

    if (polygons.length === 0) continue
    let segPoly = polygons[0]!
    for (let j = 1; j < polygons.length; j++) {
      const poly = polygons[j]
      if (!poly) continue
      segPoly = BooleanOperations.unify(segPoly, poly)
    }

    bucket.push(segPoly)
  }
}
