import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import User from "../users/user.model";
import { authenticate } from "./auth.service";

export async function login(req: Request, res: Response) {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const session = await authenticate(email, password);
    if (!session) {
        return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    return res.json({ success: true, ...session });
}

export async function me(req: AuthRequest, res: Response) {
    const user = await User.findOne({ userId: req.user!.userId })
        .select("userId organizationId name email role active");

    if (!user?.active) {
        return res.status(401).json({ success: false, error: "User is inactive" });
    }

    return res.json({ success: true, user });
}
