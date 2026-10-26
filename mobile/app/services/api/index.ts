/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import { ApiResponse as ApisauceApiResponse, ApisauceInstance, create } from "apisauce"

import Config from "@/config"

import {
  AuthenticateRequest,
  AuthenticateResponse,
  PasswordAuthRequest,
  RequestMagicLinkRequest,
  RequestMagicLinkResponse,
} from "./accounts"
import { APIResponse } from "./responses"
import type { ApiConfig } from "./types"
import { CreateRideRequest, CreateRideResponse } from "./rides"
import { GetLeaderboardResponse, GetMyScoreHistoryResponse, GetMyTotalScoreResponse } from "./scores"
import { loadString } from "@/utils/storage"
import {
  Account,
  Category,
  ControllableCategoryPacing,
  PlannedEntryWithStatus,
  SavingsGoal,
  SavingsGoalProgress,
  TagSpending,
  Transaction,
  UpdateTransactionRequest,
} from "./celeiro"

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
}

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
      },
    })
    this.apisauce.addAsyncRequestTransform(async (request) => {
      const authToken = await loadString("authToken")
      if (authToken && request.headers) {
        request.headers["X-Session-ID"] = authToken
      }
      const activeOrganization = await loadString("activeOrganization")
      if (activeOrganization && request.headers) {
        request.headers["X-Active-Organization"] = activeOrganization
      }
      console.debug(`Request: ${request.url}`)
    })
    this.apisauce.addAsyncResponseTransform(async (response) => {
      console.debug(`Response: ${response.status}`)
    })
  }

  // Auth

  async requestMagicLink(
    input: RequestMagicLinkRequest,
  ): Promise<APIResponse<RequestMagicLinkResponse>> {
    const response: ApisauceApiResponse<APIResponse<RequestMagicLinkResponse>> =
      await this.apisauce.post(`/auth/request/`, input)
    return response.data!
  }

  async authenticate(input: AuthenticateRequest): Promise<APIResponse<AuthenticateResponse>> {
    const response: ApisauceApiResponse<APIResponse<AuthenticateResponse>> =
      await this.apisauce.post(`/auth/validate/`, input)
    return response.data!
  }

  async authenticateWithPassword(
    input: PasswordAuthRequest,
  ): Promise<APIResponse<AuthenticateResponse>> {
    const response: ApisauceApiResponse<APIResponse<AuthenticateResponse>> =
      await this.apisauce.post(`/auth/password/`, input)
    return response.data!
  }

  // Scores

  async getMyScoreHistory(): Promise<APIResponse<GetMyScoreHistoryResponse>> {
    const response: ApisauceApiResponse<APIResponse<GetMyScoreHistoryResponse>> =
      await this.apisauce.get(`/scores/history/`)
    return response.data!
  }

  async getMyTotalScore(): Promise<APIResponse<GetMyTotalScoreResponse>> {
    const response: ApisauceApiResponse<APIResponse<GetMyTotalScoreResponse>> =
      await this.apisauce.get(`/scores/total/`)
    return response.data!
  }

  async getLeaderboard(): Promise<APIResponse<GetLeaderboardResponse>> {
    const response: ApisauceApiResponse<APIResponse<GetLeaderboardResponse>> =
      await this.apisauce.get(`/scores/leaderboard/`)
    return response.data!
  }

  // Rides

  async createRide(input: CreateRideRequest): Promise<APIResponse<CreateRideResponse>> {
    const response: ApisauceApiResponse<APIResponse<CreateRideResponse>> = await this.apisauce.post(
      `/rides/`,
      input,
    )
    return response.data!
  }

  // Celeiro finance

  async getFinancialAccounts(): Promise<APIResponse<Account[]>> {
    const response: ApisauceApiResponse<APIResponse<Account[]>> =
      await this.apisauce.get(`/financial/accounts`)
    return response.data!
  }

  async getTransactions(accountId: number, limit = 1000): Promise<APIResponse<Transaction[]>> {
    const response: ApisauceApiResponse<APIResponse<Transaction[]>> = await this.apisauce.get(
      `/financial/accounts/${accountId}/transactions`,
      { limit },
    )
    return response.data!
  }

  async getUncategorizedTransactions(limit = 1000): Promise<APIResponse<Transaction[]>> {
    const response: ApisauceApiResponse<APIResponse<Transaction[]>> = await this.apisauce.get(
      `/financial/transactions/uncategorized`,
      { limit },
    )
    return response.data!
  }

  async updateTransaction(
    accountId: number,
    transactionId: number,
    input: UpdateTransactionRequest,
  ): Promise<APIResponse<Transaction>> {
    const response: ApisauceApiResponse<APIResponse<Transaction>> = await this.apisauce.patch(
      `/financial/accounts/${accountId}/transactions/${transactionId}`,
      input,
    )
    return response.data!
  }

  async getCategories(): Promise<APIResponse<Category[]>> {
    const response: ApisauceApiResponse<APIResponse<Category[]>> =
      await this.apisauce.get(`/financial/categories`)
    return response.data!
  }

  async getCategoryPacing(
    month: number,
    year: number,
  ): Promise<APIResponse<ControllableCategoryPacing>> {
    const response: ApisauceApiResponse<APIResponse<ControllableCategoryPacing>> =
      await this.apisauce.get(`/financial/budgets/categories/pacing`, { month, year })
    return response.data!
  }

  async getPlannedEntriesForMonth(
    month: number,
    year: number,
  ): Promise<APIResponse<PlannedEntryWithStatus[]>> {
    const response: ApisauceApiResponse<APIResponse<PlannedEntryWithStatus[]>> =
      await this.apisauce.get(`/financial/planned-entries/month`, { month, year })
    return response.data!
  }

  async getTagSpending(month: number, year: number): Promise<APIResponse<TagSpending[]>> {
    const response: ApisauceApiResponse<APIResponse<TagSpending[]>> = await this.apisauce.get(
      `/financial/tags/spending`,
      { month, year },
    )
    return response.data!
  }

  async getSavingsGoals(): Promise<APIResponse<SavingsGoal[]>> {
    const response: ApisauceApiResponse<APIResponse<SavingsGoal[]>> = await this.apisauce.get(
      `/financial/savings-goals`,
      { is_active: true },
    )
    return response.data!
  }

  async getSavingsGoalProgress(goalId: number): Promise<APIResponse<SavingsGoalProgress>> {
    const response: ApisauceApiResponse<APIResponse<SavingsGoalProgress>> =
      await this.apisauce.get(`/financial/savings-goals/${goalId}/progress`)
    return response.data!
  }
}

// Singleton instance of the API for convenience
export const api = new Api()
