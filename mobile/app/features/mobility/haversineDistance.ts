const AVG_EARTH_RADIUS_KM = 6371.0088;

function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(point1: [number, number], point2: [number, number]) {
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;

  const rlat1 = degreesToRadians(lat1);
  const rlon1 = degreesToRadians(lon1);
  const rlat2 = degreesToRadians(lat2);
  const rlon2 = degreesToRadians(lon2);

  const dlat = rlat2 - rlat1;
  const dlon = rlon2 - rlon1;

  const a = Math.sin(dlat / 2) ** 2 +
      Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));

  return AVG_EARTH_RADIUS_KM * c;
}