import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { createUser, deleteUser, listUsers, resetUserPassword, updateUser } from "./user.controller";

const router = Router();
router.use(requireAuth, requireRole("admin"));
router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:userId", updateUser);
router.patch("/:userId/password", resetUserPassword);
router.delete("/:userId", deleteUser);

export default router;
