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
export const internalDeviceRouter = Router();


internalDeviceRouter.post(
    "/online",
    deviceOnline
);


internalDeviceRouter.post(
    "/offline",
    deviceOffline
);


internalDeviceRouter.post(
    "/heartbeat",
    deviceHeartbeat
);


router.get("/", requireAuth, listDevices);

router.get(
    "/:deviceId",
    requireAuth,
    getDeviceState
);


export default router;
