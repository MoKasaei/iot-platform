import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { createUser, listUsers, updateUser } from "./user.controller";

const router = Router();
router.use(requireAuth, requireRole("admin"));
router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:userId", updateUser);

export default router;
