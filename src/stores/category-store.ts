import { create } from "zustand"
import { cacheGet, cacheSet } from "@/lib/cache"

interface CategoryState {
  selected: string[]
  toggle: (id: string) => void
  addCustom: (category: { id: string; name: string; description: string }) => void
  reset: () => void
  _loaded?: boolean
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  selected: [],
  toggle: (id) =>
    set((state) => ({
      selected: state.selected.includes(id)
        ? state.selected.filter((x) => x !== id)
        : [...state.selected, id],
    })),
  addCustom: (category) =>
    set((state) => ({
      selected: [...state.selected, category.id],
    })),
  reset: () => set({ selected: [] }),
  _loaded: false,
}))

export function hydrateCategoryStore(): boolean {
  const store = useCategoryStore.getState()
  if (store._loaded) return false
  const saved = cacheGet<string[]>("categories")
  if (saved) store._loaded = true
  useCategoryStore.setState({ selected: saved ?? [], _loaded: true })
  return !!saved
}

export function persistCategories(): void {
  cacheSet("categories", useCategoryStore.getState().selected)
}
