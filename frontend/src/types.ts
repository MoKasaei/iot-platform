export type Role = "admin" | "user";

export interface User {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  primaryAdmin?: boolean;
  createdAt?: string;
}

export interface Device {
  deviceId: string;
  organizationId: string;
  typeId: string;
  typeName?: string;
  name: string;
  hardware: string;
  firmwareVersion: string;
  online: boolean;
  lastSeen?: string;
  state?: Record<string, unknown>;
  location?: {
    latitude: number;
    longitude: number;
    label?: string;
  };
}

export interface DeviceType {
  typeId: string;
  name: string;
  icon?: string;
}

export interface DeviceCredentials {
  username: string;
  password: string;
}

export interface TelemetryPoint {
  _id: string;
  deviceId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WeatherReading {
  temperature: number;
  relativeHumidity: number;
  dewPoint: number;
  weatherCode: number;
  observedAt: string;
  source: "Open-Meteo";
  sourceLatitude: number;
  sourceLongitude: number;
  distanceKm: number;
}
