import { Router } from "express";
import { receiveTelemetry } from "./telemetry.controller";
import {
    getTelemetry
} from "./telemetry.controller";

const router = Router();


router.post(
    "/internal/telemetry",
    receiveTelemetry
);

router.get(
    "/api/devices/:deviceId/telemetry",
    getTelemetry
);


export default router;