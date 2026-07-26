import { Router } from "express";
import {
    deviceOnline,
    deviceOffline,
    deviceHeartbeat
} from "./device.controller";
import {
    getDeviceState
} from "./device.controller";
import { listDevices } from "./device.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();


router.post(
    "/internal/device/online",
    deviceOnline
);


router.post(
    "/internal/device/offline",
    deviceOffline
);


router.post(
    "/internal/device/heartbeat",
    deviceHeartbeat
);


router.get("/", requireAuth, listDevices);

router.get(
    "/:deviceId",
    requireAuth,
    getDeviceState
);


export default router;
