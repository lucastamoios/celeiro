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
  RequestMagicLinkRequest,
  RequestMagicLinkResponse,
} from "./accounts"
import { APIResponse } from "./responses"
import type { ApiConfig } from "./types"
import { CreateRideRequest, CreateRideResponse } from "./rides"
import { GetLeaderboardResponse, GetMyScoreHistoryResponse, GetMyTotalScoreResponse } from "./scores"
import { storage } from "@/utils/storage"

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
      const authToken = storage.getString("authToken")
      if (authToken && request.headers) {
        request.headers["X-Session-ID"] = authToken
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
}

// Singleton instance of the API for convenience
export const api = new Api()
