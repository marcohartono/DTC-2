// Geofencing: per-green polygons stored as a GeoJSON FeatureCollection in
// courses.geojson_holes. Each feature is a Polygon tagged with its hole number.
// Detection is a plain ray-casting point-in-polygon test — no external dep.
//
// GeoJSON coordinate order is [longitude, latitude].

export interface HoleFeature {
  type: 'Feature';
  properties: { hole: number };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [ring][vertex][lon, lat]; ring 0 = outer
  };
}

export interface HoleFeatureCollection {
  type: 'FeatureCollection';
  features: HoleFeature[];
}

export const EMPTY_FC: HoleFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

/** Ray-casting test against a single linear ring of [lon, lat] vertices. */
function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True if (lon, lat) is inside the polygon (outer ring minus any holes). */
export function pointInPolygon(
  lon: number,
  lat: number,
  polygon: number[][][],
): boolean {
  const outer = polygon[0];
  if (!outer || !pointInRing(lon, lat, outer)) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(lon, lat, polygon[i]!)) return false; // inside a cut-out
  }
  return true;
}

/** Returns the hole number whose polygon contains the point, or null. */
export function detectHole(
  lat: number,
  lon: number,
  fc: HoleFeatureCollection | null | undefined,
): number | null {
  if (!fc?.features?.length) return null;
  for (const f of fc.features) {
    if (
      f.geometry?.type === 'Polygon' &&
      pointInPolygon(lon, lat, f.geometry.coordinates)
    ) {
      return f.properties.hole;
    }
  }
  return null;
}
