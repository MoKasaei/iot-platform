import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type UserRole = "admin" | "user";

export interface AuthUser {
    userId: string;
    email: string;
    role: UserRole;
    organizationId: string;
}

export interface AuthRequest extends Request {
    user?: AuthUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const authorization = req.header("authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Authentication required" });
    }

    try {
        req.user = jwt.verify(
            authorization.slice(7),
            env.jwtSecret
        ) as AuthUser;
        return next();
    } catch {
        return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
}

export function requireRole(...roles: UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: "Insufficient permissions" });
        }
        return next();
    };
}
