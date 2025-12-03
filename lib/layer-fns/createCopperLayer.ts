import type { Polygon } from "@flatten-js/core"

import type { LayerBuckets } from "../layers/layerBuckets"
import { unionShapes } from "../helpers/polygons"

export const createCopperLayer = (
  copperByLayer: LayerBuckets,
  layerName: string,
): Polygon | undefined => {
  const bucket = copperByLayer.get(layerName)
  if (!bucket || bucket.length === 0) return undefined
  return unionShapes(bucket)
}
