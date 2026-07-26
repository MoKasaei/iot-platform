import { Router } from "express";

import {
    getOrganizations
} from "./organization.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), getOrganizations);

export default router;
