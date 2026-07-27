import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import User from "../users/user.model";
import { normalizeEmail, normalizePhone } from "./identity";

export async function authenticate(identifier: string, password: string) {
    const user = await User.findOne({
        active: true,
        $or: [
            { email: normalizeEmail(identifier) },
            { phone: normalizePhone(identifier) }
        ]
    })
        .select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return null;
    }

    const payload = {
        userId: user.userId,
        email: user.email,
        phone: user.phone,
        role: user.role,
        organizationId: user.organizationId
    };

    return {
        token: jwt.sign(payload, env.jwtSecret, { expiresIn: "12h" }),
        user: {
            ...payload,
            name: user.name,
            nickname: user.nickname,
            profilePhoto: user.profilePhoto,
            deviceLimit: user.deviceLimit,
            theme: user.theme,
            fontSize: user.fontSize,
            muteAlarmNotifications: user.muteAlarmNotifications,
            primaryAdmin: user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()
        }
    };
}
