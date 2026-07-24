import mongoose from "mongoose";

export async function connectMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);

        console.log("✅ MongoDB Connected");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}