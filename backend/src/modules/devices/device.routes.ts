import { Router } from "express";
import {
    deviceOnline,
    deviceOffline,
    deviceHeartbeat
} from "./device.controller";
import {
    getDeviceState
} from "./device.controller";

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


router.get(
    "/:deviceId",
    getDeviceState
);


export default router;