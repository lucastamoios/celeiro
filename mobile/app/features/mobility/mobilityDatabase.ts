import * as SQLite from "expo-sqlite"
import * as Crypto from "expo-crypto"
import { GeoPoint } from "@/features/mobility/mobility-types"
import { Coordinate } from "@/features/mobility/RouteManager"
import { RideType } from "@/features/mobility/models"
import { SessionInfoResponse } from "@/services/api/accounts"
import { queryClient } from "@/services/api/queryclient"
//
import { api } from "@/services/api"

type DBRide = {
  uuid: string
  start_time: string
  finish_time: string
  distance: number
  completed: boolean
  geo_points: string
  raw_coords: string
  type: string
  freeroam: boolean
}

const TABLE_VERSION = "3"
const TABLE_NAME = `rides${TABLE_VERSION}`

class MobilityDatabase {
  private static instance: MobilityDatabase
  private db: SQLite.SQLiteDatabase | null = null

  private constructor() {}

  public static getInstance(): MobilityDatabase {
    if (!MobilityDatabase.instance) {
      MobilityDatabase.instance = new MobilityDatabase()
    }
    return MobilityDatabase.instance
  }

  private async initDatabase(): Promise<void> {
    try {
      if (!this.db) {
        this.db = await SQLite.openDatabaseAsync("ecorpRidesInternalDB", {
          useNewConnection: true,
        })
        await this.db.execAsync("PRAGMA journal_mode = WAL;")
        await this.db.execAsync(`
                    CREATE TABLE IF NOT EXISTS ${TABLE_NAME}
                    (
                        uuid        TEXT PRIMARY KEY NOT NULL,
                        user_id     INTEGER          NOT NULL,
                        start_time  TIMESTAMP        NOT NULL,
                        finish_time TIMESTAMP,
                        distance    INTEGER,
                        geo_points  TEXT,
                        raw_coords  TEXT,
                        completed   BOOLEAN DEFAULT FALSE,
                        type        TEXT,
                        freeroam    BOOLEAN
                    );
                    CREATE INDEX IF NOT EXISTS idx_rides_user_id_completed ON ${TABLE_NAME} (user_id, completed);
                    CREATE INDEX IF NOT EXISTS idx_rides_user_id_uuid ON ${TABLE_NAME} (user_id, uuid);
                `)
      }
    } catch (error) {
      console.error("Error in initDatabase:", error)
      throw error
    }
  }

  public async insertRide(user_id: number): Promise<string> {
    try {
      await this.initDatabase()
      const uuid = Crypto.randomUUID()

      await this.db!.execAsync(`
                INSERT INTO ${TABLE_NAME}
                (user_id,
                 uuid,
                 start_time)
                VALUES (${user_id},
                        '${uuid}',
                        datetime('now'))
            `)

      return uuid
    } catch (error) {
      console.error("Error in insertRide:", error)
      throw error
    }
  }

  public async getUncompletedRides(user_id: number): Promise<DBRide[]> {
    try {
      await this.initDatabase()

      const res = await this.db!.getAllAsync(`
                SELECT uuid,
                       start_time,
                       finish_time,
                       completed,
                       geo_points,
                       raw_coords,
                       type,
                       freeroam,
                       distance
                FROM ${TABLE_NAME}
                WHERE completed = 0
                  AND user_id = ${user_id};
            `)

      return res as DBRide[]
    } catch (error) {
      console.error("Error in getUncompletedRides:", error)
      throw error
    }
  }

  public async markRideAsCompleted(userId: number, rideUUID: string): Promise<void> {
    try {
      await this.initDatabase()

      await this.db!.execAsync(`
                UPDATE ${TABLE_NAME}
                SET completed = 1
                WHERE uuid = '${rideUUID}'
                  AND user_id = ${userId};
            `)
    } catch (error) {
      console.error("Error in markRideAsCompleted:", error)
      throw error
    }
  }

  public async updateRide(
    userId: number,
    rideUUID: string,
    rideType: RideType,
    freeroam: boolean,
    geo_points: GeoPoint[],
    raw_coords: Coordinate[],
    distance: number,
  ): Promise<void> {
    try {
      await this.initDatabase()

      await this.db!.execAsync(`
                UPDATE ${TABLE_NAME}
                SET geo_points  = '${JSON.stringify(geo_points)}',
                    raw_coords  = '${JSON.stringify(raw_coords)}',
                    finish_time = datetime('now'),
                    type        = '${rideType}',
                    freeroam    = ${freeroam ? 1 : 0},
                    distance    = ${distance}
                WHERE uuid = '${rideUUID}'
                  AND user_id = ${userId}
                  AND completed = FALSE;
            `)
    } catch (error) {
      console.error("Error in updateRide:", error)
      throw error
    }
  }

  public async getRide(user_id: number, rideUUID: string): Promise<DBRide | null> {
    try {
      await this.initDatabase()

      const res = await this.db!.getFirstAsync(`
                SELECT uuid,
                       start_time,
                       finish_time,
                       completed,
                       geo_points,
                       raw_coords,
                       type,
                       freeroam,
                       distance
                FROM ${TABLE_NAME}
                WHERE user_id = ${user_id}
                  AND uuid = '${rideUUID}';
            `)

      if (!res) {
        return null
      }

      return res as DBRide
    } catch (error) {
      console.error("Error in getRide:", error)
      throw error
    }
  }

  private async deleteRide(user_id: number, uuid: string): Promise<void> {
    try {
      await this.initDatabase()

      await this.db!.execAsync(`
                DELETE
                FROM ${TABLE_NAME}
                WHERE user_id = ${user_id}
                  AND uuid = '${uuid}';
            `)
    } catch (error) {
      console.error("Error in deleteRide:", error)
      throw error
    }
  }

  public async saveUnsavedRides(session?: SessionInfoResponse): Promise<void> {
    try {
      if (!session) return

      const rides = await this.getUncompletedRides(session.user.id)

      console.info("=========== Checking for uncompleted rides... =========== ")
      console.info(`Got ${rides.length} uncompleted rides.`)

      for (let ride of rides) {
        if (!!ride.geo_points) {
          console.log(`[${ride.uuid}] Saving uncompleted ride...`)
          await api.createRide({
            uuid: ride.uuid,
            geo_points: ride.geo_points,
            raw_coords: ride.raw_coords,
            start_time: ride.start_time,
            finish_time: ride.finish_time,
            freeroam: ride.freeroam,
            distance: ride.distance,
            type: ride.type as RideType,
          })
          await this.markRideAsCompleted(session.user.id, ride.uuid)
        } else {
          console.log(`[${ride.uuid}] Found invalid ride. Deleting...`)
          await this.deleteRide(session.user.id, ride.uuid)
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["user"] })
      console.info("=========== END Checking for uncompleted rides... =========== ")
    } catch (error) {
      console.error("Error in saveUnsavedRides:", error)
      throw error
    }
  }
}

// Export a singleton instance
export const mobilityDatabase = MobilityDatabase.getInstance()
