"use client"

import { create } from "zustand"

interface SelectionState {
  mode: boolean
  selected: Set<string>
  highlightedId: string | null

  enter: (initialId?: string) => void
  exit: () => void
  toggle: (id: string) => void
  setHighlight: (id: string | null) => void
  isSelected: (id: string) => boolean
  count: () => number
}

export const useMessageSelectionStore = create<SelectionState>((set, get) => ({
  mode: false,
  selected: new Set<string>(),
  highlightedId: null,

  enter: (initialId) => {
    const next = new Set<string>()
    if (initialId) next.add(initialId)
    set({ mode: true, selected: next })
  },

  exit: () => set({ mode: false, selected: new Set<string>(), highlightedId: null }),

  toggle: (id) => {
    const state = get()
    const next = new Set(state.selected)
    if (next.has(id)) {
      next.delete(id)
      if (next.size === 0) {
        set({ mode: false, selected: next, highlightedId: null })
        return
      }
    } else {
      next.add(id)
    }
    set({ selected: next, mode: next.size > 0 })
  },

  setHighlight: (id) => set({ highlightedId: id }),

  isSelected: (id) => get().selected.has(id),
  count: () => get().selected.size,
}))
