import { create } from "zustand"
import type { CronJob, CronRun } from "@/types/cron"

interface CronState {
  jobs: CronJob[]
  selectedJobId: string | null
  runs: Record<string, CronRun[]>

  setJobs: (jobs: CronJob[]) => void
  selectJob: (jobId: string | null) => void
  setRuns: (jobId: string, runs: CronRun[]) => void
  updateJob: (jobId: string, patch: Partial<CronJob>) => void
  clear: () => void
}

export const useCronStore = create<CronState>()((set) => ({
  jobs: [],
  selectedJobId: null,
  runs: {},

  setJobs: (jobs) => set({ jobs }),

  selectJob: (selectedJobId) => set({ selectedJobId }),

  setRuns: (jobId, runs) =>
    set((state) => ({
      runs: { ...state.runs, [jobId]: runs },
    })),

  updateJob: (jobId, patch) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.jobId === jobId ? { ...j, ...patch } : j,
      ),
    })),

  clear: () => set({ jobs: [], selectedJobId: null, runs: {} }),
}))
