import type Flatten from "@flatten-js/core"
import type { Polygon } from "@flatten-js/core"

export type LayerBuckets = Map<string, Array<Polygon | Flatten.Box>>

export const ensureLayerBucket = (
  buckets: LayerBuckets,
  layerName: string,
): Array<Polygon | Flatten.Box> => {
  let bucket = buckets.get(layerName)
  if (!bucket) {
    bucket = []
    buckets.set(layerName, bucket)
  }
  return bucket
}
