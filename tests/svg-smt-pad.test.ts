import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"

import { convertCircuitJsonToGeometry } from "../index"
import { renderSvgFromGeometry } from "./helpers/renderSvgFromGeometry"

test("smt pads appear on top and bottom copper", async () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-pads",
      width: 14,
      height: 8,
      center: { x: 7, y: 4 },
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad-top",
      shape: "rect",
      x: 3,
      y: 3,
      width: 1.5,
      height: 1,
      layer: "top",
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad-bottom",
      shape: "rect",
      x: 10,
      y: 5,
      width: 1.2,
      height: 1,
      layer: "bottom",
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)
  const svg = renderSvgFromGeometry(geometry)

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
