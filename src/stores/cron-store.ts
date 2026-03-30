import { create } from "zustand"
import type { CronJob, CronRun } from "@/types/cron"

interface CronState {
  jobs: CronJob[]
  runs: Record<string, CronRun[]>

  setJobs: (jobs: CronJob[]) => void
  setRuns: (jobId: string, runs: CronRun[]) => void
  updateJob: (jobId: string, patch: Partial<CronJob>) => void
  clear: () => void
}

export const useCronStore = create<CronState>()((set) => ({
  jobs: [],
  runs: {},

  setJobs: (jobs) => set({ jobs }),

  setRuns: (jobId, runs) =>
    set((state) => ({
      runs: { ...state.runs, [jobId]: runs },
    })),

  updateJob: (jobId, patch) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)),
    })),

  clear: () => set({ jobs: [], runs: {} }),
}))
