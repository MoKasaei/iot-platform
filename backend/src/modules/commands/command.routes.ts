import { Router } from "express";

import {
    sendCommand,
    commandAck
} from "./command.controller";
import { requireAuth } from "../../middleware/auth.middleware";


const router = Router();


router.post(
    "/:deviceId/command",
    requireAuth,
    sendCommand
);


router.post(
    "/ack",
    commandAck
);


export default router;
