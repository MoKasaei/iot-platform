import { Router } from "express";
import {
    deviceOnline,
    deviceOffline,
    deviceHeartbeat
} from "./device.controller";
import {
    createDevice,
    getDeviceState,
    getDeviceWeather,
    listDeviceTypes,
    renameDevice,
    updateDeviceLocation
} from "./device.controller";
import { listDevices } from "./device.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

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

router.post(
    "/",
    requireAuth,
    requireRole("admin"),
    createDevice
);

router.get(
    "/types",
    requireAuth,
    listDeviceTypes
);

router.patch(
    "/:deviceId",
    requireAuth,
    renameDevice
);

router.patch(
    "/:deviceId/location",
    requireAuth,
    updateDeviceLocation
);

router.get(
    "/:deviceId/weather",
    requireAuth,
    getDeviceWeather
);

router.get(
    "/:deviceId",
    requireAuth,
    getDeviceState
);


export default router;
