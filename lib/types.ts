import type { Polygon } from "@flatten-js/core"

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
