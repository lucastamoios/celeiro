import {
  Point,
  DestinationInfo,
} from "@/features/mobility/mobility-types";
import axios from "axios";

const googleMapsApiKey = "AIzaSyBdQWRFEtrNDwMnjzPSkpvslsHJlFEK0tE";

export async function getGoogleMapsRoute(
  startLoc: Point,
  destinationLoc: Point,
): Promise<DestinationInfo | null> {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: `${startLoc[0]},${startLoc[1]}`,
          destination: `${destinationLoc[0]},${destinationLoc[1]}`,
          mode: "bicycling",
          key: googleMapsApiKey,
        },
      },
    );

    const responseWalking = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: `${startLoc[0]},${startLoc[1]}`,
          destination: `${destinationLoc[0]},${destinationLoc[1]}`,
          mode: "walking",
          key: googleMapsApiKey,
        },
      },
    );

    if (response.data.routes.length <= 0) {
      return null;
    }
    const points = decodePolyline(
      response.data.routes[0].overview_polyline.points,
    );
    console.log(response.data);
    const duration = response.data.routes[0].legs[0].duration.value;
    const durationWalking =
      responseWalking.data.routes[0].legs[0].duration.value;
    const distance = response.data.routes[0].legs[0].distance.value;
    return {
      points: points,
      durationSeconds: duration,
      durationSecondsWalking: durationWalking,
      distanceMeters: distance,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

function decodePolyline(encoded: string): Point[] {
  let points: Point[] = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
