import "dotenv/config";

function required(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

export const env = {
    host: process.env.MQTT_HOST || "0.0.0.0",
    port: Number(process.env.MQTT_PORT || 1883),
    offlineGraceMs: Number(process.env.MQTT_OFFLINE_GRACE_MS || 3000),
    backendUrl: process.env.BACKEND_URL || "http://127.0.0.1:3000",
    backendUsername: required("MQTT_BACKEND_USERNAME"),
    backendPassword: required("MQTT_BACKEND_PASSWORD")
};
