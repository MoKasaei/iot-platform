import { Router } from "express";

import {
    deviceOnline,
    deviceOffline
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


export default router;