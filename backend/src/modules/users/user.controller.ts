import { Response } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { AuthRequest } from "../../middleware/auth.middleware";
import User from "./user.model";

export async function listUsers(req: AuthRequest, res: Response) {
    const users = await User.find({ organizationId: req.user!.organizationId })
        .select("userId organizationId name email role active createdAt")
        .sort({ createdAt: -1 });
    const primaryEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    return res.json({
        success: true,
        users: users.map(user => ({
            ...user.toObject(),
            primaryAdmin: user.email.toLowerCase() === primaryEmail
        }))
    });
}

export async function createUser(req: AuthRequest, res: Response) {
    const { name, email, password, role = "user" } = req.body ?? {};

    if (!name || !email || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
            success: false,
            error: "Name, email and a password of at least 8 characters are required"
        });
    }
    if (!["admin", "user"].includes(role)) {
        return res.status(400).json({ success: false, error: "Invalid role" });
    }
    if (await User.exists({ email: String(email).toLowerCase() })) {
        return res.status(409).json({ success: false, error: "Email already exists" });
    }

    const user = await User.create({
        userId: randomUUID(),
        organizationId: req.user!.organizationId,
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role
    });

    return res.status(201).json({
        success: true,
        user: {
            userId: user.userId, organizationId: user.organizationId, name: user.name,
            email: user.email, role: user.role, active: user.active
        }
    });
}

export async function updateUser(req: AuthRequest, res: Response) {
    const { role, active, name } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    const target = await User.findOne({
        userId: req.params.userId,
        organizationId: req.user!.organizationId
    }).select("email");

    if (!target) {
        return res.status(404).json({
            success: false,
            error: "User not found"
        });
    }

    const isPrimaryAdmin =
        target.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
    if (
        isPrimaryAdmin &&
        ((role !== undefined && role !== "admin") || active === false)
    ) {
        return res.status(403).json({
            success: false,
            error: "The primary administrator cannot be disabled or demoted"
        });
    }
    if (role !== undefined) {
        if (!["admin", "user"].includes(role)) {
            return res.status(400).json({ success: false, error: "Invalid role" });
        }
        updates.role = role;
    }
    if (typeof active === "boolean") updates.active = active;
    if (typeof name === "string" && name.trim()) updates.name = name.trim();

    const user = await User.findOneAndUpdate(
        { userId: req.params.userId, organizationId: req.user!.organizationId },
        updates,
        { new: true }
    ).select("userId organizationId name email role active");

    return res.json({ success: true, user: {
        ...user!.toObject(),
        primaryAdmin: isPrimaryAdmin
    } });
}
