import { create } from 'zustand';

interface UIState {
  isCartDrawerOpen: boolean;
  isSearchModalOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
  openSearchModal: () => void;
  closeSearchModal: () => void;
  toggleSearchModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCartDrawerOpen: false,
  isSearchModalOpen: false,

  openCartDrawer: () => set({ isCartDrawerOpen: true }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),
  toggleCartDrawer: () => set((state) => ({ isCartDrawerOpen: !state.isCartDrawerOpen })),

  openSearchModal: () => set({ isSearchModalOpen: true }),
  closeSearchModal: () => set({ isSearchModalOpen: false }),
  toggleSearchModal: () => set((state) => ({ isSearchModalOpen: !state.isSearchModalOpen }))
}));
