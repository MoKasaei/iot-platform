import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { getOverview } from "./overview.controller";

const router = Router();
router.get("/", requireAuth, requireRole("admin"), getOverview);

export default router;
