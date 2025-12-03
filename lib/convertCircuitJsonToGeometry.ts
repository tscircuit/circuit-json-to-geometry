import type {
  AnyCircuitElement,
  CircuitJson,
  PcbCutout,
  PcbPlatedHole,
  PcbSmtPad,
  PcbTrace,
} from "circuit-json"
import type { Polygon } from "@flatten-js/core"

import type {
  CircuitGeometryLayers,
  ConvertCircuitJsonToGeometryOptions,
} from "./types"
import { pickPrimaryBoardLike } from "./element-fns/board/pickPrimaryBoardLike"
import { boardLikeToPolygon } from "./element-fns/board/boardLikeToPolygon"
import { addSmtPadCopper } from "./element-fns/smt-pad/addSmtPadCopper"
import { addPcbTraceCopper } from "./element-fns/trace/addPcbTraceCopper"
import { addPlatedHoleCopper } from "./element-fns/plated-hole/addPlatedHoleCopper"
import { addCutoutPolygon } from "./element-fns/cutout/addCutoutPolygon"
import { filterCutoutsForBoard } from "./element-fns/cutout/filterCutoutsForBoard"
import type { LayerBuckets } from "./layers/layerBuckets"
import { createCopperLayer } from "./layer-fns/createCopperLayer"
import { unionShapes } from "./helpers/polygons"

export const convertCircuitJsonToGeometry = (
  circuitJson: CircuitJson,
  options: ConvertCircuitJsonToGeometryOptions = {},
): CircuitGeometryLayers => {
  const elements = circuitJson as AnyCircuitElement[]
  const origin = options.origin ?? { x: 0, y: 0 }

  const primaryBoard = pickPrimaryBoardLike(elements, options.pcbBoardId)
  const boardOutline =
    primaryBoard != null ? boardLikeToPolygon(primaryBoard, origin) : undefined

  const copperByLayer: LayerBuckets = new Map()

  for (const elm of elements) {
    switch (elm.type) {
      case "pcb_smtpad":
        addSmtPadCopper(elm as PcbSmtPad, origin, copperByLayer)
        break
      case "pcb_trace":
        addPcbTraceCopper(elm as PcbTrace, origin, copperByLayer)
        break
      case "pcb_plated_hole":
        addPlatedHoleCopper(elm as PcbPlatedHole, origin, copperByLayer)
        break
      default:
        break
    }
  }

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

  const topCopper = createCopperLayer(copperByLayer, "top")
  const bottomCopper = createCopperLayer(copperByLayer, "bottom")
  const inner1Copper = createCopperLayer(copperByLayer, "inner1")
  const inner2Copper = createCopperLayer(copperByLayer, "inner2")

  return {
    boardOutline,
    topCopper,
    bottomCopper,
    inner1Copper,
    inner2Copper,
    cutout: cutoutUnion,
  }
}
