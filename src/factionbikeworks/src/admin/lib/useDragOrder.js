import { useState } from "react";

/** Minimal drag-to-reorder for lists: returns props for each item and the drag state. */
export function useDragOrder(items, onReorder) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const itemProps = (index) => ({
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      setDrag(index);
    },
    onDragOver: (e) => {
      if (drag === null) return;
      e.preventDefault();
      setOver(index);
    },
    onDrop: (e) => {
      e.preventDefault();
      if (drag !== null && drag !== index) {
        const next = [...items];
        const [x] = next.splice(drag, 1);
        next.splice(index, 0, x);
        onReorder(next);
      }
      setDrag(null);
      setOver(null);
    },
    onDragEnd: () => {
      setDrag(null);
      setOver(null);
    },
    "data-dragging": drag === index || undefined,
    "data-over": (over === index && drag !== index) || undefined,
  });
  const move = (index, delta) => {
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [x] = next.splice(index, 1);
    next.splice(to, 0, x);
    onReorder(next);
  };
  return { itemProps, move };
}
