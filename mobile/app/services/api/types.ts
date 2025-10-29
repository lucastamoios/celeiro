export interface StreamItem {
  id: number
  uuid: string
  name: string
  active: boolean
  rtmp_url: string
  preview_url: string
  stream_key: string
  is_online: boolean
  last_event: {
    event_type: string
    event_data: {
      reason: string
    }
  }
}

export type GetStreamsResponse = StreamItem[]

export interface EpisodeItem {
  title: string
  pubDate: string
  link: string
  guid: string
  author: string
  thumbnail: string
  description: string
  content: string
  enclosure: {
    link: string
    type: string
    length: number
    duration: number
    rating: { scheme: string; value: string }
  }
  categories: string[]
}

export interface ApiFeedResponse {
  status: string
  feed: {
    url: string
    title: string
    link: string
    author: string
    description: string
    image: string
  }
  items: EpisodeItem[]
}

/**
 * The options used to configure apisauce.
 */
export interface ApiConfig {
  /**
   * The URL of the api.
   */
  url: string

  /**
   * Milliseconds before we timeout the request.
   */
  timeout: number
}
