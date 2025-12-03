import type {
  AnyCircuitElement,
  CircuitJson,
  PcbBoard,
  PcbCutout,
  PcbPanel,
  PcbSmtPad,
  PcbSmtPadRect,
  PcbTrace,
  PcbPlatedHole,
  Point,
} from "circuit-json"
import Flatten, {
  Box,
  BooleanOperations,
  Polygon,
  point,
} from "@flatten-js/core"

/**
 * Public shape of the geometry output.
 *
 * All properties are optional so callers can feature-detect.
 */
export interface CircuitGeometryLayers {
  /** Board outline (panel or board) in board coordinates */
  boardOutline?: Polygon

  /** Copper polygons per layer */
  topCopper?: Polygon
  bottomCopper?: Polygon
  inner1Copper?: Polygon
  inner2Copper?: Polygon

  /** Not yet implemented – reserved for silkscreen */
  topSilkscreen?: Polygon
  bottomSilkscreen?: Polygon

  /** Not yet implemented – reserved for mask geometry */
  soldermask?: Polygon

  /**
   * Union of board-level cutouts (rects/circles/polygons).
   * Currently only `pcb_cutout` is used, not holes.
   */
  cutout?: Polygon
}

/**
 * Options for conversion.
 */
export interface ConvertCircuitJsonToGeometryOptions {
  /**
   * Translate all geometry by this offset before returning.
   * Defaults to { x: 0, y: 0 }.
   */
  origin?: { x: number; y: number }

  /**
   * If provided, only consider cutouts that either have no
   * pcb_board_id or match this board id. Board outline selection
   * is still based on first pcb_board/pcb_panel found.
   */
  pcbBoardId?: string
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

type LayerBuckets = Map<string, Array<Polygon | Box>>

const DEFAULT_TRACE_WIDTH = 0.15 // mm – matches lbrn implementation

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

/**
 * Local copy of the lbrn circleToPolygon helper, but kept internal.
 */
const circleToPolygon = (circle: any, segments = 32): Polygon => {
  const points: any[] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i * 2 * Math.PI) / segments
    const x = circle.center.x + circle.r * Math.cos(angle)
    const y = circle.center.y + circle.r * Math.sin(angle)
    points.push(Flatten.point(x, y))
  }
  return new Flatten.Polygon(points)
}

/**
 * Utility to ensure a bucket exists for a given layer name.
 */
const ensureLayerBucket = (
  buckets: LayerBuckets,
  layerName: string,
): Array<Polygon | Box> => {
  let bucket = buckets.get(layerName)
  if (!bucket) {
    bucket = []
    buckets.set(layerName, bucket)
  }
  return bucket
}

/**
 * Convert a Box or Polygon[] into a single unified Polygon.
 */
const unionShapes = (shapes: Array<Polygon | Box>): Polygon | undefined => {
  if (shapes.length === 0) return undefined

  const toPolygon = (shape: Polygon | Box): Polygon =>
    shape instanceof Polygon ? shape : new Polygon(shape)

  let acc = toPolygon(shapes[0]!)
  for (let i = 1; i < shapes.length; i++) {
    const poly = toPolygon(shapes[i]!)
    acc = BooleanOperations.unify(acc, poly)
  }
  return acc
}

/**
 * Create a rectangle polygon, optionally rotated around its center.
 */
const createRectPolygon = (
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

/**
 * Create a polygon from a set of points.
 */
const polygonFromPoints = (points: Point[], origin: { x: number; y: number }) =>
  new Polygon(points.map((p) => point(p.x + origin.x, p.y + origin.y)))

/**
 * Convert a board or panel to a FlattenJS polygon.
 * Mirrors lbrn's addPcbBoard logic.
 */
const boardLikeToPolygon = (
  board: PcbBoard | PcbPanel,
  origin: { x: number; y: number },
): Polygon | undefined => {
  // Prefer explicit outline if present
  if ((board as any).outline && Array.isArray((board as any).outline)) {
    const outline = (board as any).outline as Point[]
    if (outline.length >= 3) {
      return polygonFromPoints(outline, origin)
    }
  }

  // Fallback to width/height/center rectangular board
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

/**
 * Pick a "primary" board-like object (panel or board).
 *
 * - If a pcbBoardId is supplied and a board matches it, that wins.
 * - Otherwise, prefer the first pcb_board.
 * - If no board exists, fallback to first pcb_panel.
 */
const pickPrimaryBoardLike = (
  elements: AnyCircuitElement[],
  pcbBoardId?: string,
): PcbBoard | PcbPanel | undefined => {
  const boards = elements.filter((e) => e.type === "pcb_board") as PcbBoard[]

  const panels = elements.filter((e) => e.type === "pcb_panel") as PcbPanel[]

  if (pcbBoardId) {
    const match = boards.find((b) => b.pcb_board_id === pcbBoardId)
    if (match) return match
  }

  if (boards.length > 0) return boards[0]
  if (panels.length > 0) return panels[0]

  return undefined
}

/**
 * Filter pcb_cutout list to those that apply to the chosen board.
 * Mirrors filterCutoutsForBoard in circuit-json-to-gltf.
 */
const filterCutoutsForBoard = (
  cutouts: PcbCutout[],
  board: PcbBoard | PcbPanel,
): PcbCutout[] => {
  const boardId = (board as any).pcb_board_id as string | undefined
  if (!boardId) return cutouts
  return cutouts.filter((cutout) => {
    const cutoutBoardId = (cutout as any).pcb_board_id as string | undefined
    return !cutoutBoardId || cutoutBoardId === boardId
  })
}

/* ------------------------------------------------------------------ */
/* Geometry builders                                                  */
/* ------------------------------------------------------------------ */

/**
 * Add copper geometry for rectangular SMT pads.
 * This mirrors lbrn's addRectSmtPad but without per-net grouping.
 */
const addSmtPadCopper = (
  smtPad: PcbSmtPad,
  origin: { x: number; y: number },
  copperByLayer: LayerBuckets,
) => {
  if (smtPad.shape !== "rect") {
    // Other shapes can be added later as needed
    return
  }

  const rectPad = smtPad as PcbSmtPadRect
  const layer = (rectPad.layer as string) ?? "top"

  const centerX = rectPad.x + origin.x
  const centerY = rectPad.y + origin.y
  const halfWidth = rectPad.width / 2
  const halfHeight = rectPad.height / 2

  const bucket = ensureLayerBucket(copperByLayer, layer)
  bucket.push(
    new Box(
      centerX - halfWidth,
      centerY - halfHeight,
      centerX + halfWidth,
      centerY + halfHeight,
    ),
  )
}

/**
 * Add copper geometry for pcb_trace.
 * This is derived from lbrn's addPcbTrace, but:
 * - does not rely on connectivity/net ids
 * - groups geometry by layer based on each segment's start/end layer
 */
const addPcbTraceCopper = (
  trace: PcbTrace,
  origin: { x: number; y: number },
  copperByLayer: LayerBuckets,
) => {
  const route = trace.route
  if (!route || route.length < 2) return

  // Derive default width from first "wire" segment like lbrn
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

    // Circles for each endpoint of the segment
    const endpoints = [start, end]
    for (const pt of endpoints) {
      if (!pt) continue
      const circle = new Flatten.Circle(
        new Flatten.Point(pt.x + origin.x, pt.y + origin.y),
        width / 2,
      )
      polygons.push(circleToPolygon(circle))
    }

    // Rectangle for the segment itself
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

    // Union circles + rectangle into a single polygon for this segment
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

/**
 * Add copper geometry for pcb_plated_hole.
 *
 * This focuses just on the pad (outer copper), not the drilled void.
 * Shapes are approximated when necessary (e.g. oval/pill -> polygon).
 */
const addPlatedHoleCopper = (
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
      // Approximate pill as its bounding rectangle (outer_width/outer_height)
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
      // Keep behavior safe – just ignore unknown shapes
      // eslint-disable-next-line no-console
      console.warn(`Unknown plated hole shape: ${(hole as any).shape}`)
    }
  }
}

/**
 * Convert pcb_cutout to a Flatten polygon and push it into the array.
 */
const addCutoutPolygon = (
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

/* ------------------------------------------------------------------ */
/* Main entrypoint                                                    */
/* ------------------------------------------------------------------ */

export const convertCircuitJsonToGeometry = (
  circuitJson: CircuitJson,
  options: ConvertCircuitJsonToGeometryOptions = {},
): CircuitGeometryLayers => {
  const elements = circuitJson as AnyCircuitElement[]
  const origin = options.origin ?? { x: 0, y: 0 }

  // 1. Board outline
  const primaryBoard = pickPrimaryBoardLike(elements, options.pcbBoardId)
  const boardOutline =
    primaryBoard != null ? boardLikeToPolygon(primaryBoard, origin) : undefined

  // 2. Copper shapes per layer
  const copperByLayer: LayerBuckets = new Map()

  for (const elm of elements) {
    switch (elm.type) {
      case "pcb_smtpad": {
        addSmtPadCopper(elm as PcbSmtPad, origin, copperByLayer)
        break
      }
      case "pcb_trace": {
        addPcbTraceCopper(elm as PcbTrace, origin, copperByLayer)
        break
      }
      case "pcb_plated_hole": {
        addPlatedHoleCopper(elm as PcbPlatedHole, origin, copperByLayer)
        break
      }
      default:
        break
    }
  }

  // 3. Board cutouts
  const allCutouts = elements.filter(
    (e) => e.type === "pcb_cutout",
  ) as PcbCutout[]

  const filteredCutouts =
    primaryBoard != null
      ? filterCutoutsForBoard(allCutouts, primaryBoard)
      : allCutouts

  const cutoutPolygons: Polygon[] = []
  for (const cutout of filteredCutouts) {
    addCutoutPolygon(cutout, origin, cutoutPolygons)
  }

  const cutoutUnion = unionShapes(cutoutPolygons)

  // 4. Build output layer polygons from buckets

  const getLayerUnion = (layerName: string): Polygon | undefined => {
    const bucket = copperByLayer.get(layerName)
    if (!bucket || bucket.length === 0) return undefined
    return unionShapes(bucket)
  }

  const topCopper = getLayerUnion("top")
  const bottomCopper = getLayerUnion("bottom")
  const inner1Copper = getLayerUnion("inner1")
  const inner2Copper = getLayerUnion("inner2")

  const result: CircuitGeometryLayers = {
    boardOutline,
    topCopper,
    bottomCopper,
    inner1Copper,
    inner2Copper,
    // Silkscreen & soldermask intentionally left undefined for now
    cutout: cutoutUnion,
  }

  return result
}
