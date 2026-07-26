import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import User from "./user.model";

export async function ensureUserIndexes() {
    const indexes = await User.collection.indexes();
    const emailIndex = indexes.find(index => index.name === "email_1");
    if (emailIndex && !emailIndex.sparse) {
        await User.collection.dropIndex("email_1");
    }
    await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
}

export async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set; admin seed skipped");
        return;
    }
    if (password.length < 8) {
        throw new Error("ADMIN_PASSWORD must be at least 8 characters");
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
        existing.role = "admin";
        existing.active = true;
        existing.deviceLimit = null;
        await existing.save();
        return;
    }

    await User.create({
        userId: randomUUID(),
        organizationId: process.env.ADMIN_ORGANIZATION_ID || "ORG001",
        name: process.env.ADMIN_NAME || "Platform Administrator",
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "admin",
        deviceLimit: null
    });
    console.log("Default admin created");
}
