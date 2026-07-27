import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import User from "../users/user.model";
import { authenticate } from "./auth.service";
import bcrypt from "bcrypt";
import crypto, { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import Device from "../devices/device.model";
import Telemetry from "../telemetry/telemetry.model";
import Command from "../commands/command.model";
import Alarm from "../alarms/alarm.model";
import { normalizeEmail, normalizePhone, validEmail, validPhone } from "./identity";

const registrationWindows = new Map<string, { count: number; resetAt: number }>();
const CAPTCHA_TTL_MS = 5 * 60 * 1000;

function signCaptcha(payload: string) {
    return crypto.createHmac("sha256", env.jwtSecret).update(payload).digest("base64url");
}

function validPhoto(value: unknown) {
    return value === undefined || value === "" ||
        (typeof value === "string" &&
         value.length <= 350_000 &&
         /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value));
}

async function deleteUserData(userId: string, organizationId: string) {
    const devices = await Device.find({ ownerUserId: userId, organizationId }).select("deviceId");
    const ids = devices.map(device => device.deviceId);
    await Promise.all([
        Telemetry.deleteMany({ organizationId, deviceId: { $in: ids } }),
        Command.deleteMany({ organizationId, deviceId: { $in: ids } }),
        Device.deleteMany({ organizationId, ownerUserId: userId }),
        Alarm.deleteMany({ organizationId, ownerUserId: userId })
    ]);
}

export async function login(req: Request, res: Response) {
    const { identifier = req.body?.email, password } = req.body ?? {};

    if (typeof identifier !== "string" || typeof password !== "string") {
        return res.status(400).json({ success: false, error: "Email or phone and password are required" });
    }

    const session = await authenticate(identifier, password);
    if (!session) {
        return res.status(401).json({ success: false, error: "Invalid email, phone, or password" });
    }

    return res.json({ success: true, ...session });
}

export async function me(req: AuthRequest, res: Response) {
    const user = await User.findOne({ userId: req.user!.userId })
        .select("userId organizationId name email phone role active nickname profilePhoto deviceLimit theme fontSize muteAlarmNotifications");

    if (!user?.active) {
        return res.status(401).json({ success: false, error: "User is inactive" });
    }

    return res.json({ success: true, user });
}

export function captcha(_req: Request, res: Response) {
    const left = crypto.randomInt(2, 10);
    const right = crypto.randomInt(1, 10);
    const payload = Buffer.from(JSON.stringify({
        answer: left + right,
        expiresAt: Date.now() + CAPTCHA_TTL_MS,
        nonce: crypto.randomBytes(8).toString("hex")
    })).toString("base64url");
    return res.json({
        success: true,
        question: `${left} + ${right} = ?`,
        token: `${payload}.${signCaptcha(payload)}`
    });
}

export async function register(req: Request, res: Response) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const window = registrationWindows.get(ip);
    if (window && window.resetAt > now && window.count >= 5) {
        return res.status(429).json({ success: false, error: "Too many registration attempts. Try again later." });
    }
    registrationWindows.set(ip, window && window.resetAt > now
        ? { ...window, count: window.count + 1 }
        : { count: 1, resetAt: now + 15 * 60 * 1000 });

    const { name, email, phone, password, captchaToken, captchaAnswer, website } = req.body ?? {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    if (website) return res.status(400).json({ success: false, error: "Registration rejected" });
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120 ||
        (!normalizedEmail && !normalizedPhone) ||
        (normalizedEmail && !validEmail(normalizedEmail)) ||
        (normalizedPhone && !validPhone(normalizedPhone)) ||
        typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ success: false, error: "Enter a valid name, email or phone, and password of at least 8 characters" });
    }
    const [payload, signature] = String(captchaToken || "").split(".");
    const expectedSignature = payload ? signCaptcha(payload) : "";
    if (!payload || !signature || signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
        return res.status(400).json({ success: false, error: "CAPTCHA expired or invalid" });
    }
    try {
        const challenge = JSON.parse(Buffer.from(payload, "base64url").toString());
        if (challenge.expiresAt < now || Number(captchaAnswer) !== challenge.answer) {
            return res.status(400).json({ success: false, error: "CAPTCHA answer is incorrect or expired" });
        }
    } catch {
        return res.status(400).json({ success: false, error: "CAPTCHA expired or invalid" });
    }
    if ((normalizedEmail && await User.exists({ email: normalizedEmail })) ||
        (normalizedPhone && await User.exists({ phone: normalizedPhone }))) {
        return res.status(409).json({ success: false, error: "Email or phone already exists" });
    }
    await User.create({
        userId: randomUUID(),
        organizationId: process.env.ADMIN_ORGANIZATION_ID || "ORG001",
        name: name.trim(),
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        passwordHash: await bcrypt.hash(password, 12),
        role: "user",
        deviceLimit: 1
    });
    return res.status(201).json({ success: true, message: "Account created. You can now sign in." });
}

export async function updateMe(req: AuthRequest, res: Response) {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const theme = req.body.theme;
    const fontSize = req.body.fontSize;
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const muteAlarmNotifications = req.body.muteAlarmNotifications;
    if (!name || name.length > 120) {
        return res.status(400).json({ success: false, error: "Enter a valid name of 120 characters or fewer" });
    }
    if (!email && !phone) {
        return res.status(400).json({ success: false, error: "Enter an email address or phone number" });
    }
    if ((email && !validEmail(email)) || (phone && !validPhone(phone))) {
        return res.status(400).json({ success: false, error: "Enter a valid email address or phone number" });
    }
    if (!validPhoto(req.body.profilePhoto)) {
        return res.status(400).json({ success: false, error: "Use a PNG, JPEG, or WebP profile photo under 250 KB" });
    }
    if (theme !== undefined && !["default", "dark", "spring", "summer", "autumn", "winter"].includes(theme)) {
        return res.status(400).json({ success: false, error: "Select a valid account theme" });
    }
    if (fontSize !== undefined && !["standard", "large", "extra-large"].includes(fontSize)) {
        return res.status(400).json({ success: false, error: "Select a valid font size" });
    }
    const current = await User.findOne({ userId: req.user!.userId }).select("email role");
    if (!current) return res.status(404).json({ success: false, error: "User not found" });
    const primaryAdmin = current.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
    if (primaryAdmin && email !== current.email?.toLowerCase()) {
        return res.status(403).json({ success: false, error: "The primary administrator email is controlled by the server environment" });
    }
    if (email && await User.exists({ email, userId: { $ne: req.user!.userId } })) {
        return res.status(409).json({ success: false, error: "Email already exists" });
    }
    if (phone && await User.exists({ phone, userId: { $ne: req.user!.userId } })) {
        return res.status(409).json({ success: false, error: "Phone number already exists" });
    }
    const profileUpdate: Record<string, unknown> = {
        name,
        profilePhoto: req.body.profilePhoto || null,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(theme ? { theme } : {}),
        ...(fontSize ? { fontSize } : {}),
        ...(current.role === "admin" && typeof muteAlarmNotifications === "boolean"
            ? { muteAlarmNotifications }
            : {})
    };
    const user = await User.findOneAndUpdate(
        { userId: req.user!.userId },
        {
            $set: profileUpdate,
            $unset: {
                ...(!email ? { email: 1 } : {}),
                ...(!phone ? { phone: 1 } : {})
            }
        },
        { new: true }
    ).select("userId organizationId name email phone role active nickname profilePhoto deviceLimit theme fontSize muteAlarmNotifications");
    if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.json({
        success: true,
        user: {
            ...user.toObject(),
            primaryAdmin
        }
    });
}

export async function changePassword(req: AuthRequest, res: Response) {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({ success: false, error: "Current password and a new password of at least 8 characters are required" });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ success: false, error: "Choose a password different from your current password" });
    }
    const user = await User.findOne({ userId: req.user!.userId, active: true }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(400).json({ success: false, error: "Current password is incorrect" });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.json({ success: true });
}

export async function deleteMe(req: AuthRequest, res: Response) {
    if (req.user!.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) {
        return res.status(403).json({ success: false, error: "The primary administrator cannot be removed" });
    }
    if (req.body?.confirmation !== "DELETE MY ACCOUNT") {
        return res.status(400).json({ success: false, error: 'Type "DELETE MY ACCOUNT" to confirm' });
    }
    await deleteUserData(req.user!.userId, req.user!.organizationId);
    await User.deleteOne({ userId: req.user!.userId });
    return res.json({ success: true });
}

export { deleteUserData };
