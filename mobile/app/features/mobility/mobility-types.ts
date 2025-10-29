/**
 * @property {number} 0 - The latitude coordinate.
 * @property {number} 1 - The longitude coordinate.
 * @property {number} 2 - The speed in meters per second.
 * @property {number} 3 - The altitude.
 * @property {number} 4 - The timestamp.
 */
export type GeoPoint = [number, number, number, number, number];

/**
 * @property {number} 0 - The latitude coordinate.
 * @property {number} 1 - The longitude coordinate.
 */
export type Point = [number, number];

export type DestinationInfo = {
  points: Point[];
  durationSeconds: number;
  durationSecondsWalking: number;
  distanceMeters: number;
};

export type MobilityDestination = {
  coords: Point;
  address: string;
} | null;

export type Mode = "select" | "track" | "finish";

export type MobilityRunType = "work" | "home" | "free"
