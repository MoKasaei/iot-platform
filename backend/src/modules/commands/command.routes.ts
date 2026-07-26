import { Router } from "express";

import {
    sendCommand,
    commandAck
} from "./command.controller";


const router = Router();


router.post(
    "/:deviceId/command",
    sendCommand
);


router.post(
    "/ack",
    commandAck
);


export default router;