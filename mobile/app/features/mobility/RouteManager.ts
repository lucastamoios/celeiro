import { haversineDistance } from "@/features/mobility/haversineDistance";
import { GeoPoint } from "@/features/mobility/mobility-types";
import { Location } from "react-native-background-geolocation";
import { KalmanFilter, State } from "@/features/mobility/lib/kalman-filter/index";

/**
 * Represents a single GPS coordinate with additional metadata
 */
export class Coordinate {
  public lat: number;
  public lng: number;
  public timestamp: number;
  public speed: number;
  public inferredSpeed: number;
  public heading: number;
  public distance: number;
  public score: number;
  public issues: string[];
  public altitude: number;
  public accuracy: number;

  private constructor(
    lat: number,
    lng: number,
    timestamp: number,
    speed: number,
    altitude: number,
    heading: number,
    accuracy: number,
  ) {
    this.lat = lat;
    this.lng = lng;
    this.timestamp = timestamp;
    this.speed = speed;
    this.altitude = altitude;
    this.heading = heading;
    this.inferredSpeed = 0;
    this.distance = 0;
    this.score = 100;
    this.issues = [];
    this.accuracy = accuracy;
  }

  /**
   * Factory method to create a Coordinate from a Location
   */
  public static fromLocation(location: Location): Coordinate {
    return new Coordinate(
      location.coords.latitude,
      location.coords.longitude,
      new Date(location.timestamp).getTime(),
      location.coords.speed ?? 0,
      location.coords.altitude ?? -1,
      location.coords.heading ?? -1,
      location.coords.accuracy,
    );
  }
}

/**
 * Manages the route, coordinates, and applies filtering
 */
class RouteManager {
  private static instance: RouteManager | null = null;
  public lastCoordinate: Coordinate | null = null;
  public coordinates: Coordinate[] = [];
  public geoPoints: GeoPoint[] = [];
  public totalDistance: number = 0;
  private kFilter!: KalmanFilter;
  private lastKalmanState: State | null = null;

  private readonly MAX_FUTURE_TIME = 60 * 1000; // 1 minutes in milliseconds
  private readonly MAX_TIME_GAP = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly MAX_SPEED = 27; // m/s
  private readonly MAX_ACCELERATION = 10; // m/s^2
  private readonly MAX_ALTITUDE_CHANGE = 100; // meters per second
  private readonly MIN_ACCURACY = 30; // meters

  private constructor() {
    this.initializeKalmanFilter();
  }

  /**
   * Initialize or reset the Kalman filter
   */
  private initializeKalmanFilter(): void {
    this.kFilter = new KalmanFilter({
      observation: {
        name: "sensor",
        sensorDimension: 2,
        sensorCovariance: [0.0001, 0.0001], // Regular GPS accuracy
      },
      dynamic: {
        name: "constant-speed",
        timeStep: 1, // Assume 1 second between updates, adjust as needed
        covariance: [0.00001, 0.00001, 0.00005, 0.00005], // Position and velocity covariances
      },
    });
    this.lastKalmanState = null;
  }

  /**
   * Singleton pattern to ensure only one instance of RouteManager
   */
  public static getInstance(): RouteManager {
    if (!RouteManager.instance) {
      RouteManager.instance = new RouteManager();
    }
    return RouteManager.instance;
  }

  /**
   * Main method to add a new coordinate to the route
   */
  public addCoordinate(location: Location): void {
    const newCoord = Coordinate.fromLocation(location);

    if (this.lastCoordinate == null) {
      this.appendCoordinate(newCoord);
      return;
    }

    newCoord.distance = this.calculateDistanceMeters(
      this.lastCoordinate,
      newCoord,
    );

    this.applyFilters(newCoord);

    this.applyKalmanFilter(newCoord);

    if (newCoord.score < 100) {
      console.info("INVALID: ", newCoord.issues);
      if (this.coordinates.length === 1) {
        this.resetCoordinates(newCoord);
      }
    } else {
      this.appendCoordinate(newCoord);
    }

    this.coordinates.push(newCoord);
  }

  private appendCoordinate(newCoord: Coordinate) {
    this.geoPoints.push([
      newCoord.lat,
      newCoord.lng,
      newCoord.speed * 3.6,
      newCoord.altitude,
      newCoord.timestamp,
    ]);
    this.totalDistance += newCoord.distance;
    this.lastCoordinate = newCoord;
  }

  private resetCoordinates(newCoord: Coordinate) {
    this.coordinates = [newCoord];
    this.geoPoints = [
      [
        newCoord.lat,
        newCoord.lng,
        newCoord.speed * 3.6,
        newCoord.altitude,
        newCoord.timestamp,
      ],
    ];
    this.lastCoordinate = newCoord;
  }

  /**
   * Apply various filters to validate the new coordinate
   */
  private applyFilters(newCoord: Coordinate): void {
    if (!this.lastCoordinate) {
      return;
    }

    const timeDiffSeconds =
      (newCoord.timestamp - this.lastCoordinate.timestamp) / 1000; // seconds

    newCoord.inferredSpeed = newCoord.distance / timeDiffSeconds;

    // Accuracy check
    if (newCoord.accuracy > this.MIN_ACCURACY) {
      this.adjustScore(newCoord, -50, "low_accuracy");
    }

    // Timestamp check
    if (newCoord.timestamp < this.lastCoordinate.timestamp) {
      this.adjustScore(newCoord, -30, "past_timestamp");
    } else if (newCoord.timestamp > Date.now() + this.MAX_FUTURE_TIME) {
      this.adjustScore(newCoord, -30, "future_timestamp");
    } else if (timeDiffSeconds > this.MAX_TIME_GAP / 1000) {
      this.adjustScore(newCoord, -20, "large_time_gap");
    }

    // Speed x Inferred Speed
    if (Math.abs(newCoord.inferredSpeed - newCoord.speed) > 10) {
      this.adjustScore(newCoord, -10, "speed_mismatch");
    }

    // Speed Check
    if (newCoord.speed > this.MAX_SPEED) {
      this.adjustScore(newCoord, -20, "high_speed");
    }

    // Inferred Speed Check
    if (newCoord.inferredSpeed > this.MAX_SPEED) {
      this.adjustScore(newCoord, -20, "high_inferred_speed");
    }

    // Acceleration Check
    if (this.lastCoordinate) {
      const accelerationMetersSecondSquared =
        Math.abs(newCoord.speed - this.lastCoordinate.speed) / timeDiffSeconds;
      if (Math.abs(accelerationMetersSecondSquared) > this.MAX_ACCELERATION) {
        this.adjustScore(newCoord, -30, "high_acceleration");
      }
    }

    // Inferred Acceleration Check
    if (this.lastCoordinate) {
      const accelerationMetersSecondSquared =
        Math.abs(newCoord.inferredSpeed - this.lastCoordinate.inferredSpeed) /
        timeDiffSeconds;
      if (Math.abs(accelerationMetersSecondSquared) > this.MAX_ACCELERATION) {
        this.adjustScore(newCoord, -30, "high_inferred_acceleration");
      }
    }

    // Altitude change check
    const altitudeChangeRate =
      Math.abs(newCoord.altitude - this.lastCoordinate.altitude) /
      timeDiffSeconds;
    if (altitudeChangeRate > this.MAX_ALTITUDE_CHANGE) {
      this.adjustScore(newCoord, -10, "rapid_altitude_change");
    }

    // Heading change check
    // const noHeading =
    //   newCoord.heading === -1 || this.lastCoordinate.heading === -1;
    // const headingChange = Math.abs(
    //   newCoord.heading - this.lastCoordinate.heading,
    // );
    // const headingChangeValid =
    //   headingChange < this.MAX_HEADING_CHANGE;
    // if (!headingChangeValid && !noHeading) {
    //   this.adjustScore(newCoord, -10, "invalid_heading_change");
    // }
  }

  private adjustScore(
    coord: Coordinate,
    adjustment: number,
    issue: string,
  ): void {
    coord.score = Math.max(0, Math.min(100, coord.score + adjustment));
    coord.issues.push(issue);
  }

  /**
   * Apply Kalman filter for smoothing
   */
  private applyKalmanFilter(newCoord: Coordinate): void {
    try {
      const observation = [newCoord.lat, newCoord.lng];
      let filteredState;

      if (this.lastKalmanState) {
        const predicted = this.kFilter.predict({
          previousCorrected: this.lastKalmanState,
        });
        filteredState = this.kFilter.correct({ predicted, observation });
      } else {
        filteredState = this.kFilter.filter({
          previousCorrected: undefined,
          observation,
        });
      }

      newCoord.lat = filteredState.mean[0][0];
      newCoord.lng = filteredState.mean[1][0];

      if (this.lastCoordinate) {
        newCoord.distance = this.calculateDistanceMeters(
          this.lastCoordinate,
          newCoord,
        );
      }

      this.lastKalmanState = filteredState;
    } catch (error) {
      console.error("Error applying Kalman filter:", error);
      // Fallback to unfiltered coordinates if Kalman filter fails
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistanceMeters(
    coord1: Coordinate,
    coord2: Coordinate,
  ): number {
    return (
      haversineDistance([coord1.lat, coord1.lng], [coord2.lat, coord2.lng]) *
      1000
    );
  }

  /**
   * Reset all data
   */
  public reset(): void {
    this.coordinates = [];
    this.totalDistance = 0;
    this.geoPoints = [];
    this.lastCoordinate = null;
    this.initializeKalmanFilter();
  }

  /**
   * Add a stationary coordinate (not part of the moving route)
   */
  public addStationaryCoordinate(location: Location): void {
    this.lastCoordinate = Coordinate.fromLocation(location);
  }
}

export const routeManager = RouteManager.getInstance();
