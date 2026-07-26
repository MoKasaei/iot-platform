import { Router } from "express";

import {
    getCurrentOrganization, getOrganizations, updateCurrentOrganization
} from "./organization.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), getOrganizations);
router.get("/current", requireAuth, getCurrentOrganization);
router.patch("/current", requireAuth, requireRole("admin"), updateCurrentOrganization);

export default router;
