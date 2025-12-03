import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"

import { convertCircuitJsonToGeometry } from "../index"

test("builds copper per layer including inner layers from plated holes", () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-1",
      width: 10,
      height: 10,
      center: { x: 0, y: 0 },
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad-top",
      shape: "rect",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      layer: "top",
    } as any,
    {
      type: "pcb_trace",
      pcb_trace_id: "trace-bottom",
      route: [
        { x: 0, y: 0, layer: "bottom", width: 0.2, route_type: "wire" },
        { x: 2, y: 0, layer: "bottom", width: 0.2, route_type: "wire" },
      ],
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "via-1",
      shape: "circle",
      x: 1,
      y: 1,
      outer_diameter: 0.8,
      layers: ["top", "inner1", "inner2", "bottom"],
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)

  expect(geometry.topCopper?.box.xmin).toBeLessThanOrEqual(-0.5)
  expect(geometry.bottomCopper?.box.xmax).toBeGreaterThan(2)
  expect(geometry.inner1Copper).toBeDefined()
  expect(geometry.inner2Copper).toBeDefined()
})

test("filters cutouts by board id and applies origin offset", () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-main",
      width: 2,
      height: 2,
      center: { x: 0, y: 0 },
    } as any,
    {
      type: "pcb_cutout",
      pcb_cutout_id: "match",
      shape: "rect",
      center: { x: 0, y: 0 },
      width: 1,
      height: 1,
      pcb_board_id: "board-main",
    } as any,
    {
      type: "pcb_cutout",
      pcb_cutout_id: "other",
      shape: "rect",
      center: { x: 5, y: 5 },
      width: 1,
      height: 1,
      pcb_board_id: "board-other",
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit, {
    origin: { x: 10, y: -5 },
  })

  expect(geometry.boardOutline?.box.xmin).toBeCloseTo(9)
  expect(geometry.boardOutline?.box.ymin).toBeCloseTo(-6)
  expect(geometry.cutout?.box.xmax).toBeCloseTo(10.5)
  expect(geometry.cutout?.box.ymax).toBeCloseTo(-4.5)
})
