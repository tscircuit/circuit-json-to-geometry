import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"

import { convertCircuitJsonToGeometry } from "../index"
import { renderSvgFromGeometry } from "./helpers/renderSvgFromGeometry"

test("board cutouts are merged into svg", async () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-cutout",
      width: 20,
      height: 14,
      center: { x: 10, y: 7 },
    } as any,
    {
      type: "pcb_cutout",
      pcb_cutout_id: "rounded-window",
      shape: "circle",
      center: { x: 6, y: 5 },
      diameter: 2.5,
      pcb_board_id: "board-cutout",
    } as any,
    {
      type: "pcb_cutout",
      pcb_cutout_id: "connector-slot",
      shape: "rect",
      center: { x: 14, y: 8 },
      width: 4,
      height: 2,
      corner_radius: 0.4,
      pcb_board_id: "board-cutout",
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)
  const svg = renderSvgFromGeometry(geometry)

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
