import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"

import { convertCircuitJsonToGeometry } from "../index"
import { renderSvgFromGeometry } from "./helpers/renderSvgFromGeometry"

test("plated holes union into all specified copper layers", async () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-via",
      width: 12,
      height: 12,
      center: { x: 6, y: 6 },
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "via-center",
      shape: "circle",
      x: 6,
      y: 6,
      outer_diameter: 1.4,
      layers: ["top", "inner1", "inner2", "bottom"],
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)
  const svg = renderSvgFromGeometry(geometry)

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
