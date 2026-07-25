import mongoose from "mongoose";
import { env } from "../config/env";

export async function connectMongoDB(): Promise<void> {
    try {

        await mongoose.connect(env.mongoUri);

        console.log("✅ MongoDB Connected");

    } catch (error) {

        console.error("MongoDB connection failed");

        console.error(error);

        process.exit(1);

    }
}