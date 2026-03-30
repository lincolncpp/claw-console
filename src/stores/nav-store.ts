import { create } from "zustand"

export type Page = "overview" | "sessions" | "nodes" | "logs" | "approvals" | "agents" | "cron"

interface NavState {
  activePage: Page
  sidebarCollapsed: boolean
  setPage: (page: Page) => void
  toggleSidebar: () => void
}

export const useNavStore = create<NavState>()((set) => ({
  activePage: "overview",
  sidebarCollapsed: false,
  setPage: (activePage) => set({ activePage }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
