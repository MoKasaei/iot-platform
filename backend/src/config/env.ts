import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

export const env = {
    port: Number(process.env.PORT || 3000),

    mongoUri: required("MONGODB_URI"),

    jwtSecret: required("JWT_SECRET"),

    mqttUrl: process.env.MQTT_URL || "mqtt://127.0.0.1:1883",

    mqttUsername: required("MQTT_BACKEND_USERNAME"),

    mqttPassword: required("MQTT_BACKEND_PASSWORD"),

    mqttClientId:
        process.env.MQTT_CLIENT_ID || "service-backend-command",
};
