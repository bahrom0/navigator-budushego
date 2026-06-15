import { create } from "zustand";

interface MobileChatNavState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useMobileChatNavStore = create<MobileChatNavState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
