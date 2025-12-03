import type { PcbBoard, PcbCutout, PcbPanel } from "circuit-json"

export const filterCutoutsForBoard = (
  cutouts: PcbCutout[],
  board: PcbBoard | PcbPanel,
): PcbCutout[] => {
  const boardId = (board as any).pcb_board_id as string | undefined
  if (!boardId) return cutouts
  return cutouts.filter((cutout) => {
    const cutoutBoardId = (cutout as any).pcb_board_id as string | undefined
    return !cutoutBoardId || cutoutBoardId === boardId
  })
}
