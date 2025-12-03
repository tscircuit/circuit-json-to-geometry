import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"

import { convertCircuitJsonToGeometry } from "../index"
import { renderSvgFromGeometry } from "./helpers/renderSvgFromGeometry"

test("board outline renders to svg", async () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-outline",
      width: 18,
      height: 10,
      center: { x: 9, y: 5 },
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)
  const svg = renderSvgFromGeometry(geometry)

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
