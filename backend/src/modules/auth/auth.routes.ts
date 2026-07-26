import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { captcha, deleteMe, login, me, register, updateMe } from "./auth.controller";

const router = Router();

router.post("/login", login);
router.get("/captcha", captcha);
router.post("/register", register);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);
router.delete("/me", requireAuth, deleteMe);

export default router;
