import express from 'express';
import {
    dashboardInfo,
    getAvailableExams,
    logIn,
    submitExam,
    leaderBoard
} from '../controllers/studentController.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();
router.post('/login', logIn);
router.get('/dashboard/:id', authenticate, dashboardInfo);
router.get('/dashboard', authenticate, dashboardInfo);
router.get('/leaderboard', authenticate, leaderBoard);
router.get('/exams', authenticate, getAvailableExams);
router.post('/exams/:examId/submit', authenticate, submitExam);
export default router;