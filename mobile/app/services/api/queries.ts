import { useQuery } from "@tanstack/react-query"
import { api } from "@/services/api"

export const useGetMyScoreHistory = () =>
  useQuery({
    queryKey: ["score-history"],
    queryFn: () => api.getMyScoreHistory(),
  })

export const useGetMyTotalScore = () =>
  useQuery({
    queryKey: ["my-total-score"],
    queryFn: () => api.getMyTotalScore(),
  })

export const useGetLeaderboard = () =>
  useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => api.getLeaderboard(),
  })
