export type Role = "admin" | "user";

export interface User {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface Device {
  deviceId: string;
  organizationId: string;
  typeId: string;
  name: string;
  hardware: string;
  firmwareVersion: string;
  online: boolean;
  lastSeen?: string;
  state?: Record<string, unknown>;
}
