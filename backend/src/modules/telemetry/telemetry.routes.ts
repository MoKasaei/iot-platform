import { Router } from "express";
import { receiveTelemetry } from "./telemetry.controller";
import {
    getTelemetry
} from "./telemetry.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();


router.post(
    "/internal/telemetry",
    receiveTelemetry
);

router.get(
    "/api/devices/:deviceId/telemetry",
    requireAuth,
    getTelemetry
);


export default router;
