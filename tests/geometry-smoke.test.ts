import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToGeometry } from "../index"

test("basic board + trace geometry smoke test", () => {
  const cj: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      width: 10,
      height: 10,
      center: { x: 5, y: 5 },
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "rect",
      x: 5,
      y: 5,
      width: 1,
      height: 1,
      layer: "top",
    } as any,
  ]

  const geom = convertCircuitJsonToGeometry(cj)

  expect(geom.boardOutline).toBeDefined()
  expect(geom.topCopper).toBeDefined()
})
