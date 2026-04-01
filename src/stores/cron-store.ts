import { create } from "zustand"
import type { CronJob, CronRun } from "@/types/cron"

interface CronState {
  jobs: CronJob[]
  runs: Record<string, CronRun[]>
  runTotals: Record<string, number>

  setJobs: (jobs: CronJob[]) => void
  setRuns: (jobId: string, runs: CronRun[]) => void
  setRunTotals: (jobId: string, total: number) => void
  updateJob: (jobId: string, patch: Partial<CronJob>) => void
  addJob: (job: CronJob) => void
  removeJob: (jobId: string) => void
}

export const useCronStore = create<CronState>()((set) => ({
  jobs: [],
  runs: {},
  runTotals: {},

  setJobs: (jobs) => set({ jobs }),

  setRuns: (jobId, runs) =>
    set((state) => ({
      runs: { ...state.runs, [jobId]: runs },
    })),

  setRunTotals: (jobId, total) =>
    set((state) => ({
      runTotals: { ...state.runTotals, [jobId]: total },
    })),

  updateJob: (jobId, patch) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)),
    })),

  addJob: (job) =>
    set((state) => ({
      jobs: [...state.jobs, job],
    })),

  removeJob: (jobId) =>
    set((state) => {
      const { [jobId]: _runs, ...restRuns } = state.runs
      const { [jobId]: _totals, ...restTotals } = state.runTotals
      return {
        jobs: state.jobs.filter((j) => j.id !== jobId),
        runs: restRuns,
        runTotals: restTotals,
      }
    }),
}))
