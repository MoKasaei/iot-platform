import { AuthRequest } from "../../middleware/auth.middleware";

export function deviceAccessFilter(req: AuthRequest, deviceId?: string) {
    return {
        organizationId: req.user!.organizationId,
        ...(deviceId ? { deviceId } : {}),
        ...(req.user!.role === "admin" ? {} : { ownerUserId: req.user!.userId })
    };
}
