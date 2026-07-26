import { Router } from "express";

import {
    sendCommand,
    commandAck
} from "./command.controller";


const router = Router();


router.post(
    "/command",
    sendCommand
);


router.post(
    "/ack",
    commandAck
);


export default router;
