import { Router } from "express";
import { receiveTelemetry } from "./telemetry.controller";


const router = Router();


router.post(
    "/internal/telemetry",
    receiveTelemetry
);


export default router;