import { Router } from "express";

import {
    getOrganizations
} from "./organization.controller";

const router = Router();

router.get("/", getOrganizations);

export default router;