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

    mqttPort: Number(process.env.MQTT_PORT || 1883),
};