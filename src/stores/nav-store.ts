import { create } from "zustand"

interface NavState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useNavStore = create<NavState>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
