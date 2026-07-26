import { Response } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { AuthRequest } from "../../middleware/auth.middleware";
import User from "./user.model";
import Device from "../devices/device.model";
import { deleteUserData } from "../auth/auth.controller";
import { normalizeEmail, normalizePhone, validEmail, validPhone } from "../auth/identity";

export async function listUsers(req: AuthRequest, res: Response) {
    const users = await User.find({ organizationId: req.user!.organizationId })
        .select("userId organizationId name nickname profilePhoto email phone role active deviceLimit createdAt")
        .sort({ createdAt: -1 });
    const counts = await Device.aggregate([
        { $match: { organizationId: req.user!.organizationId } },
        { $group: { _id: "$ownerUserId", count: { $sum: 1 } } }
    ]);
    const deviceCounts = new Map(counts.map(item => [item._id, item.count]));
    const primaryEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    return res.json({
        success: true,
        users: users.map(user => ({
            ...user.toObject(),
            primaryAdmin: user.email?.toLowerCase() === primaryEmail,
            deviceCount: deviceCounts.get(user.userId) || 0
        }))
    });
}

export async function createUser(req: AuthRequest, res: Response) {
    const { name, email, phone, password, role = "user", nickname, deviceLimit = 1 } = req.body ?? {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!name || (!normalizedEmail && !normalizedPhone) ||
        (normalizedEmail && !validEmail(normalizedEmail)) ||
        (normalizedPhone && !validPhone(normalizedPhone)) ||
        typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
            success: false,
            error: "Name, email or phone, and a password of at least 8 characters are required"
        });
    }
    if (!["admin", "user"].includes(role) || !Number.isInteger(deviceLimit) || deviceLimit < 0 || deviceLimit > 100) {
        return res.status(400).json({ success: false, error: "Invalid role" });
    }
    if ((normalizedEmail && await User.exists({ email: normalizedEmail })) ||
        (normalizedPhone && await User.exists({ phone: normalizedPhone }))) {
        return res.status(409).json({ success: false, error: "Email or phone already exists" });
    }

    const user = await User.create({
        userId: randomUUID(),
        organizationId: req.user!.organizationId,
        name,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        passwordHash: await bcrypt.hash(password, 12),
        role,
        nickname: typeof nickname === "string" ? nickname.trim().slice(0, 80) : undefined,
        deviceLimit
    });

    return res.status(201).json({
        success: true,
        user: {
            userId: user.userId, organizationId: user.organizationId, name: user.name,
            email: user.email, phone: user.phone, role: user.role, active: user.active
        }
    });
}

export async function updateUser(req: AuthRequest, res: Response) {
    const { role, active, nickname, deviceLimit, email, phone } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    const target = await User.findOne({
        userId: req.params.userId,
        organizationId: req.user!.organizationId
    }).select("email phone");

    if (!target) {
        return res.status(404).json({
            success: false,
            error: "User not found"
        });
    }

    const isPrimaryAdmin =
        target.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
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
    if (nickname !== undefined) {
        if (typeof nickname !== "string" || nickname.length > 80) {
            return res.status(400).json({ success: false, error: "Nickname must be 80 characters or less" });
        }
        updates.nickname = nickname.trim() || null;
    }
    if (deviceLimit !== undefined) {
        if (!Number.isInteger(deviceLimit) || deviceLimit < 0 || deviceLimit > 100) {
            return res.status(400).json({ success: false, error: "Device limit must be between 0 and 100" });
        }
        updates.deviceLimit = isPrimaryAdmin ? null : deviceLimit;
    }
    if (email !== undefined || phone !== undefined) {
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePhone(phone);
        if ((!normalizedEmail && !normalizedPhone) ||
            (normalizedEmail && !validEmail(normalizedEmail)) ||
            (normalizedPhone && !validPhone(normalizedPhone))) {
            return res.status(400).json({ success: false, error: "A valid email or phone number is required" });
        }
        if (isPrimaryAdmin && normalizedEmail !== target.email?.toLowerCase()) {
            return res.status(403).json({ success: false, error: "The primary administrator email is controlled by the server environment" });
        }
        if (normalizedEmail && await User.exists({ email: normalizedEmail, userId: { $ne: target.userId } })) {
            return res.status(409).json({ success: false, error: "Email already exists" });
        }
        if (normalizedPhone && await User.exists({ phone: normalizedPhone, userId: { $ne: target.userId } })) {
            return res.status(409).json({ success: false, error: "Phone number already exists" });
        }
        if (normalizedEmail) updates.email = normalizedEmail;
        if (normalizedPhone) updates.phone = normalizedPhone;
        const unset: Record<string, number> = {};
        if (!normalizedEmail) unset.email = 1;
        if (!normalizedPhone) unset.phone = 1;
        const user = await User.findOneAndUpdate(
            { userId: req.params.userId, organizationId: req.user!.organizationId },
            { $set: updates, $unset: unset },
            { new: true }
        ).select("userId organizationId name nickname profilePhoto email phone role active deviceLimit");
        return res.json({ success: true, user: { ...user!.toObject(), primaryAdmin: isPrimaryAdmin } });
    }

    const user = await User.findOneAndUpdate(
        { userId: req.params.userId, organizationId: req.user!.organizationId },
        updates,
        { new: true }
    ).select("userId organizationId name nickname profilePhoto email phone role active deviceLimit");

    return res.json({ success: true, user: {
        ...user!.toObject(),
        primaryAdmin: isPrimaryAdmin
    } });
}

export async function deleteUser(req: AuthRequest, res: Response) {
    const target = await User.findOne({
        userId: req.params.userId,
        organizationId: req.user!.organizationId
    }).select("email phone userId organizationId");
    if (!target) return res.status(404).json({ success: false, error: "User not found" });
    if (target.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) {
        return res.status(403).json({ success: false, error: "The primary administrator cannot be removed" });
    }
    const contact = target.email || target.phone;
    if (req.body?.confirmation !== contact) {
        return res.status(400).json({ success: false, error: "Type the user's email or phone number to confirm permanent deletion" });
    }
    await deleteUserData(target.userId, target.organizationId);
    await target.deleteOne();
    return res.json({ success: true });
}

export async function resetUserPassword(req: AuthRequest, res: Response) {
    const temporaryPassword = req.body?.temporaryPassword;
    if (typeof temporaryPassword !== "string" || temporaryPassword.length < 8) {
        return res.status(400).json({ success: false, error: "Temporary password must be at least 8 characters" });
    }
    const target = await User.findOne({
        userId: req.params.userId,
        organizationId: req.user!.organizationId
    }).select("email +passwordHash");
    if (!target) return res.status(404).json({ success: false, error: "User not found" });
    if (target.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) {
        return res.status(403).json({ success: false, error: "Use account settings to change the primary administrator password" });
    }
    target.passwordHash = await bcrypt.hash(temporaryPassword, 12);
    await target.save();
    return res.json({ success: true });
}
