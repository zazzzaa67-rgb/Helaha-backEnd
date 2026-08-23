import express from "express";
import { addPoints, addStudent, adminDashboard, createExam, getStudentDetails, logIn, togglePaymentStatus } from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/adminAuth.js";
const router = express.Router();
router.post("/login", logIn);
router.post("/students", requireAdmin, addStudent);
router.get("/students/:studentId", requireAdmin, getStudentDetails);
router.post("/students/points", requireAdmin, addPoints);
router.post("/exams", requireAdmin, createExam);
router.patch("/students/payment-status", requireAdmin, togglePaymentStatus);
router.get("/dashboard", requireAdmin, adminDashboard);
router.get("/check", requireAdmin, (req, res) => {
    res.json({ authenticated: true, role: req.admin.role });
});
export default router;
