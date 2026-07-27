import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { dismissAlarm, dismissAllAlarms, listAlarms, readAlarm } from "./alarm.controller";

const router = Router();
router.use(requireAuth);
router.get("/", listAlarms);
router.patch("/:alarmId/read", readAlarm);
router.delete("/:alarmId", dismissAlarm);
router.delete("/", dismissAllAlarms);

export default router;
