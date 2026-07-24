import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectMongoDB } from "./database/mongodb";

const PORT = process.env.PORT || 3000;

async function start() {

    await connectMongoDB();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

}

start();