import Flatten, { BooleanOperations, Polygon, point } from "@flatten-js/core"

import { isFiniteNumber } from "./isFiniteNumber"

export const circleToPolygon = (circle: any, segments = 32): Polygon => {
  const points: any[] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i * 2 * Math.PI) / segments
    const x = circle.center.x + circle.r * Math.cos(angle)
    const y = circle.center.y + circle.r * Math.sin(angle)
    points.push(Flatten.point(x, y))
  }
  return new Flatten.Polygon(points)
}

export const unionShapes = (
  shapes: Array<Polygon | Flatten.Box>,
): Polygon | undefined => {
  if (shapes.length === 0) return undefined

  const toPolygon = (shape: Polygon | Flatten.Box): Polygon =>
    shape instanceof Polygon ? shape : new Polygon(shape)

  let acc = toPolygon(shapes[0]!)
  for (let i = 1; i < shapes.length; i++) {
    const poly = toPolygon(shapes[i]!)
    acc = BooleanOperations.unify(acc, poly)
  }
  return acc
}

export const createRectPolygon = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotationDeg = 0,
): Polygon => {
  const halfW = width / 2
  const halfH = height / 2

  const localCorners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ]

  const angleRad = (rotationDeg * Math.PI) / 180
  const cosAngle = Math.cos(angleRad)
  const sinAngle = Math.sin(angleRad)

  const worldCorners = localCorners.map((p) => ({
    x: centerX + p.x * cosAngle - p.y * sinAngle,
    y: centerY + p.x * sinAngle + p.y * cosAngle,
  }))

  return new Polygon(worldCorners.map((p) => point(p.x, p.y)))
}

export const polygonFromPoints = (
  points: Array<{ x: number; y: number }>,
  origin: { x: number; y: number },
) => new Polygon(points.map((p) => point(p.x + origin.x, p.y + origin.y)))

export const toOptionalNumber = (value: unknown): number | undefined =>
  isFiniteNumber(value) ? value : undefined
