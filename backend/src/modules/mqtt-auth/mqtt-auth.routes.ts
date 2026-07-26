import { Router } from "express";
import {
    mqttAuthController
} from "./mqtt-auth.controller";


const router = Router();


router.post(
    "/auth",
    mqttAuthController
);


export default router;
