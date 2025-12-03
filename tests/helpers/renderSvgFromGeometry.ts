import type { Polygon } from "@flatten-js/core"

import type { CircuitGeometryLayers } from "../../lib/types"

type StyledPolygon = {
  polygon: Polygon
  attrs: Record<string, string | number>
}

const collectPolygons = (geometry: CircuitGeometryLayers): StyledPolygon[] => {
  const styles: StyledPolygon[] = []

  if (geometry.boardOutline) {
    styles.push({
      polygon: geometry.boardOutline,
      attrs: {
        fill: "none",
        stroke: "#111827",
        "stroke-width": 0.08,
      },
    })
  }

  if (geometry.cutout) {
    styles.push({
      polygon: geometry.cutout,
      attrs: {
        fill: "none",
        stroke: "#b91c1c",
        "stroke-width": 0.06,
        "stroke-dasharray": "0.2 0.2",
      },
    })
  }

  const copperStyles: Array<
    [Polygon | undefined, Record<string, string | number>]
  > = [
    [geometry.topCopper, { fill: "#c2410c", "fill-opacity": 0.7 }],
    [geometry.inner1Copper, { fill: "#ea580c", "fill-opacity": 0.7 }],
    [geometry.inner2Copper, { fill: "#fb923c", "fill-opacity": 0.7 }],
    [geometry.bottomCopper, { fill: "#0ea5e9", "fill-opacity": 0.7 }],
  ]

  for (const [polygon, attrs] of copperStyles) {
    if (polygon) {
      styles.push({
        polygon,
        attrs: { stroke: "none", ...attrs },
      })
    }
  }

  return styles
}

const computeBoundingBox = (polygons: Polygon[]) => {
  let xmin = Number.POSITIVE_INFINITY
  let ymin = Number.POSITIVE_INFINITY
  let xmax = Number.NEGATIVE_INFINITY
  let ymax = Number.NEGATIVE_INFINITY

  for (const polygon of polygons) {
    const box = polygon.box
    xmin = Math.min(xmin, box.xmin)
    ymin = Math.min(ymin, box.ymin)
    xmax = Math.max(xmax, box.xmax)
    ymax = Math.max(ymax, box.ymax)
  }

  return { xmin, ymin, xmax, ymax }
}

export const renderSvgFromGeometry = (
  geometry: CircuitGeometryLayers,
): string => {
  const styledPolygons = collectPolygons(geometry)
  const polygons = styledPolygons.map((entry) => entry.polygon)

  if (polygons.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg"></svg>`
  }

  const box = computeBoundingBox(polygons)
  const padding = 0.5
  const viewBox = [
    box.xmin - padding,
    box.ymin - padding,
    box.xmax - box.xmin + padding * 2,
    box.ymax - box.ymin + padding * 2,
  ].join(" ")

  const svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`,
  ]

  for (const { polygon, attrs } of styledPolygons) {
    svgParts.push(polygon.svg(attrs as any))
  }

  svgParts.push("</svg>")

  return svgParts.join("\n")
}
