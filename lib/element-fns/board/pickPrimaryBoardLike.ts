import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"

export const pickPrimaryBoardLike = (
  elements: AnyCircuitElement[],
  pcbBoardId?: string,
): PcbBoard | PcbPanel | undefined => {
  const boards = elements.filter((e) => e.type === "pcb_board") as PcbBoard[]
  const panels = elements.filter((e) => e.type === "pcb_panel") as PcbPanel[]

  if (pcbBoardId) {
    const match = boards.find((b) => b.pcb_board_id === pcbBoardId)
    if (match) return match
  }

  if (boards.length > 0) return boards[0]
  if (panels.length > 0) return panels[0]

  return undefined
}
