import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"

import { convertCircuitJsonToGeometry } from "../index"
import { renderSvgFromGeometry } from "./helpers/renderSvgFromGeometry"

test("multilayer trace with jog renders copper", async () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-trace",
      width: 16,
      height: 12,
      center: { x: 8, y: 6 },
    } as any,
    {
      type: "pcb_trace",
      pcb_trace_id: "trace-1",
      route: [
        { x: 2, y: 2, layer: "top", width: 0.3, route_type: "wire" },
        { x: 8, y: 2, layer: "top", width: 0.3, route_type: "wire" },
        { x: 8, y: 2, layer: "bottom", width: 0.35, route_type: "wire" },
        { x: 8, y: 8, layer: "bottom", width: 0.35, route_type: "wire" },
        { x: 13, y: 8, layer: "bottom", width: 0.25, route_type: "wire" },
      ],
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)
  const svg = renderSvgFromGeometry(geometry)

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
