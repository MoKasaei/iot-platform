import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import User from "../users/user.model";

export async function authenticate(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase(), active: true })
        .select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return null;
    }

    const payload = {
        userId: user.userId,
        email: user.email,
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
            primaryAdmin: user.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()
        }
    };
}
