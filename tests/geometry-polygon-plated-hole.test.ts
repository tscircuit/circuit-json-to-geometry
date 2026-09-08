import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"

import { convertCircuitJsonToGeometry } from "../index"

test("hole_with_polygon_pad copper uses local pad_outline at the hole center", () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "poly_pad",
      shape: "hole_with_polygon_pad",
      hole_shape: "circle",
      hole_diameter: 0.6,
      x: 2,
      y: -1,
      layers: ["top"],
      pad_outline: [
        { x: -1, y: -0.5 },
        { x: 1, y: -0.5 },
        { x: 1, y: 0.5 },
        { x: -1, y: 0.5 },
      ],
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)
  const box = geometry.topCopper?.box
  expect(box).toBeDefined()
  expect(box!.xmin).toBeCloseTo(1, 5)
  expect(box!.xmax).toBeCloseTo(3, 5)
  expect(box!.ymin).toBeCloseTo(-1.5, 5)
  expect(box!.ymax).toBeCloseTo(-0.5, 5)
})

test("hole_with_polygon_pad rotates pad_outline by ccw_rotation", () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "poly_pad",
      shape: "hole_with_polygon_pad",
      hole_shape: "circle",
      hole_diameter: 0.6,
      x: 2,
      y: -1,
      ccw_rotation: 90,
      layers: ["inner1"],
      pad_outline: [
        { x: -1, y: -0.5 },
        { x: 1, y: -0.5 },
        { x: 1, y: 0.5 },
        { x: -1, y: 0.5 },
      ],
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)
  const box = geometry.inner1Copper?.box
  expect(box).toBeDefined()
  // 2×1 local rect stood on end about (2, -1)
  expect(box!.xmin).toBeCloseTo(1.5, 5)
  expect(box!.xmax).toBeCloseTo(2.5, 5)
  expect(box!.ymin).toBeCloseTo(-2, 5)
  expect(box!.ymax).toBeCloseTo(0, 5)
})
