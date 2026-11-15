import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"

import { convertCircuitJsonToGeometry } from "../index"

test("circle and rotated_rect SMT pads contribute copper instead of being dropped", () => {
  const circuit: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board-1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "circle-top",
      shape: "circle",
      x: 4,
      y: 0,
      radius: 1,
      layer: "top",
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rotated-rect-top",
      shape: "rotated_rect",
      x: 0,
      y: 0,
      width: 2,
      height: 0.4,
      ccw_rotation: 90,
      layer: "top",
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)
  const box = geometry.topCopper?.box
  expect(box).toBeDefined()
  // Circle at x=4 r=1 plus a 0.4×2 pad stood on end at the origin.
  expect(box!.xmin).toBeCloseTo(-0.2, 5)
  expect(box!.xmax).toBeCloseTo(5, 2)
  expect(box!.ymin).toBeCloseTo(-1, 2)
  expect(box!.ymax).toBeCloseTo(1, 2)
})

test("polygon SMT pads use their outline points", () => {
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
      pcb_smtpad_id: "poly",
      shape: "polygon",
      points: [
        { x: 1, y: 1 },
        { x: 3, y: 1 },
        { x: 2, y: 3 },
      ],
      layer: "bottom",
    } as any,
  ]

  const geometry = convertCircuitJsonToGeometry(circuit)
  expect(geometry.bottomCopper).toBeDefined()
  expect(geometry.bottomCopper!.box.xmin).toBeCloseTo(1, 5)
  expect(geometry.bottomCopper!.box.xmax).toBeCloseTo(3, 5)
  expect(geometry.bottomCopper!.box.ymin).toBeCloseTo(1, 5)
  expect(geometry.bottomCopper!.box.ymax).toBeCloseTo(3, 5)
})
