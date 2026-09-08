declare module "geojson" {
  export type Position = number[];

  export type Point = { type: "Point"; coordinates: Position };
  export type MultiPoint = { type: "MultiPoint"; coordinates: Position[] };
  export type LineString = { type: "LineString"; coordinates: Position[] };
  export type MultiLineString = { type: "MultiLineString"; coordinates: Position[][] };
  export type Polygon = { type: "Polygon"; coordinates: Position[][] };
  export type MultiPolygon = { type: "MultiPolygon"; coordinates: Position[][][] };
  export type GeometryCollection = { type: "GeometryCollection"; geometries: Geometry[] };
  export type Geometry = Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon | GeometryCollection;

  export type Feature<G extends Geometry = Geometry, P = Record<string, unknown> | null> = {
    type: "Feature";
    geometry: G;
    properties: P;
    id?: string | number;
    bbox?: [number,number,number,number] | [number,number,number,number,number,number];
  };

  export type FeatureCollection<G extends Geometry = Geometry, P = Record<string, unknown> | null> = {
    type: "FeatureCollection";
    features: Array<Feature<G, P>>;
  };
}
