import { Box } from "@flatten-js/core"
import type { PcbSmtPad, PcbSmtPadRect } from "circuit-json"

import { ensureLayerBucket } from "../../layers/layerBuckets"
import { isFiniteNumber } from "../../helpers/isFiniteNumber"
import type { LayerBuckets } from "../../layers/layerBuckets"

export const addSmtPadCopper = (
  smtPad: PcbSmtPad,
  origin: { x: number; y: number },
  copperByLayer: LayerBuckets,
) => {
  if (smtPad.shape !== "rect") {
    return
  }

  const rectPad = smtPad as PcbSmtPadRect
  const layer = (rectPad.layer as string) ?? "top"

  if (
    !isFiniteNumber(rectPad.x) ||
    !isFiniteNumber(rectPad.y) ||
    !isFiniteNumber(rectPad.width) ||
    !isFiniteNumber(rectPad.height)
  ) {
    return
  }

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
