import React, { createContext, useContext, useState } from 'react';

interface KanbanDragState {
  draggingId: string | null;
  overColumn: number | null;
  setDraggingId: (id: string | null) => void;
  setOverColumn: (col: number | null) => void;
}

export const KanbanDragDropContext = createContext<KanbanDragState>({
  draggingId: null,
  overColumn: null,
  setDraggingId: () => {},
  setOverColumn: () => {},
});

export function useKanbanDrag() {
  return useContext(KanbanDragDropContext);
}

export function KanbanDragDropProvider({ children }: { children: React.ReactNode }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<number | null>(null);

  return (
    <KanbanDragDropContext.Provider value={{ draggingId, overColumn, setDraggingId, setOverColumn }}>
      {children}
    </KanbanDragDropContext.Provider>
  );
}
