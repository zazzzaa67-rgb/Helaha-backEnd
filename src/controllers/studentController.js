import { supabase } from "../config/supabase.js";

// توحيد صيغة الاسم العربي قبل المقارنة مع قاعدة البيانات
// (trim + إزالة المسافات الزائدة + توحيد ترميز Unicode NFC)
const normalizeName = (value) =>
    typeof value === "string"
        ? value.normalize("NFC").replace(/\s+/g, " ").trim()
        : "";
export const dashboardInfo = async (req, res) => {
    try {
    const studentEmail = req.user.email;
    const { data, error } = await supabase
        .from("students")
        .select('full_name, email, points, "student-points", stage, grade, id, status, payment_date, created_at')
        .eq("email", studentEmail)
        .single();
    if (error) {
    return res.status(404).json({
        message: "Student not found",
        });
    }
    const studentId = data.id
    const { data: attempts, error: attemptsError } = await supabase
        .from("exam_attempts")
        .select("score, completed_at, exams(title, total_points)")
        .eq("student_id", studentId)
        .order("completed_at", { ascending: false });

    if (attemptsError) {
        return res.status(500).json({ message: attemptsError.message });
    }

    const { data: rankedStudents, error: rankError } = await supabase
        .from("students")
        .select('id, "student-points"')
        .order("student-points", { ascending: false });

    if (rankError) {
        return res.status(500).json({ message: rankError.message });
    }

    const totalPoints = Number(data.points) || 0;
    const earnedPoints = Number(data["student-points"]) || 0;
    const rank = rankedStudents.findIndex((student) => student.id === studentId) + 1;
    const averagePercentage = totalPoints > 0
        ? Math.round((earnedPoints / totalPoints) * 100)
        : 0;
    const performance = attempts.slice(0, 6).reverse().map((attempt, index) => ({
        label: `${index + 1} اختبار`,
        percentage: attempt.exams?.total_points > 0
            ? Math.round((attempt.score / attempt.exams.total_points) * 100)
            : 0,
    }));

    return res.json({
        student: data,
        stats: {
            earnedPoints,
            totalPoints,
            averagePercentage,
            attemptsCount: attempts.length,
            rank,
        },
        performance,
        recentAttempts: attempts.slice(0, 5),
    });
    } catch (error) {
    return res.status(500).json({
        message: error.message,
    });
    }
};
// ===================================

export const leaderBoard = async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const { data: student, error: studentError } = await supabase
            .from("students")
            .select('id, full_name, email,area, stage, grade, points, "student-points"')
            .eq("email", studentEmail)
            .single();

        if (studentError || !student) {
            return res.status(404).json({
                message: "Student not found",
            });
        }

        const { data: students, error } = await supabase
            .from("students")
            .select("id, full_name, points ,  area")
            .eq("stage", student.stage)
            .order("points", { ascending: false });

        if (error) {
            return res.status(500).json({
                message: error.message,
            });
        }
        const leaderboard = students.map((student, index) => ({
            rank: index + 1,
            id: student.id,
            full_name: student.full_name,
            points: student.points,
            area: student.area,
        }));

        return res.json({
            grade: student.grade,
            area: student.area,
            leaderboard,
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};
export const logIn = async (req, res) => {
    try {
        const { password, name } = req.body;

        const normalizedName = normalizeName(name);
        console.log("========== LOGIN ==========");
        console.log("Original name:", name);
        console.log("Normalized name:", normalizedName);
        console.log("Password received:", !!password);
        if (!normalizedName || !password) {
            return res.status(400).json({
                message: "اسم الطالب وكلمة المرور مطلوبان",
            });
        }

        // limit(1) بدل single() لتجنب الخطأ لو فيه أكثر من طالب بنفس الاسم
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select("id, full_name, email")
            .eq("full_name", normalizedName)
            .limit(1);
        console.log("Students:", students);
        console.log("Student error:", studentError);

        const student = students?.[0];

        if (studentError || !student) {
            console.log("❌ STUDENT NOT FOUND");
            return res.status(401).json({
                message: "اسم الطالب أو كلمة المرور غير صحيحة",
            });
        }
        console.log("✅ Student found:", student);
        console.log("Student email:", student.email);

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email: student.email,
                password,
            });
            console.log("Auth error:", error);
        console.log("Auth data exists:", !!data);

        if (error) {
            console.log("❌ PASSWORD / AUTH FAILED");
            return res.status(401).json({
                message: "اسم الطالب أو كلمة المرور غير صحيحة",
            });
        }

        return res.json({
            student,
            session: data.session,
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const getAvailableExams = async (req, res) => {
    try {
        const studentEmail = req.user?.email;

        if (!studentEmail) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const { data: student, error: studentError } = await supabase
            .from("students")
            .select("id, stage, grade")
            .eq("email", studentEmail)
            .single();

        if (studentError || !student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const { data: exams, error } = await supabase
            .from("exams")
            .select("id, title, type, stage, grade, duration_minutes, total_points, created_at, exam_questions(id, topic, question_text, points, options)")
            .eq("stage", student.stage)
            .eq("grade", student.grade)
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        return res.json({ exams });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const submitExam = async (req, res) => {
    try {
        const examId = req.params.examId;
        const submittedAnswers = Array.isArray(req.body.answers)
            ? req.body.answers
            : [];

        // =========================
        // Get exam
        // =========================
        const { data: exam, error: examError } = await supabase
            .from("exams")
            .select(
                "id, stage, grade, duration_minutes, exam_questions(id, points, correct_answer, topic)"
            )
            .eq("id", examId)
            .single();

        if (examError || !exam) {
            return res.status(404).json({
                message: "Exam not found",
            });
        }

        // =========================
        // Get student
        // =========================
        const { data: student, error: studentError } = await supabase
            .from("students")
            .select("id, stage, grade")
            .eq("email", req.user.email)
            .single();

        if (
            studentError ||
            !student ||
            student.stage !== exam.stage ||
            student.grade !== exam.grade
        ) {
            return res.status(403).json({
                message: "This exam is not available for your class",
            });
        }

        // =========================
        // Calculate score
        // =========================
        const answerMap = new Map(
            submittedAnswers.map((answer) => [
                answer.question_id,
                answer.answer,
            ])
        );

        const scoredAnswers = exam.exam_questions.map((question) => {
            const isCorrect =
                answerMap.get(question.id) === question.correct_answer;

            return {
                question_id: question.id,
                is_correct: isCorrect,
                awarded_points: isCorrect ? question.points : 0,
            };
        });

        const score = scoredAnswers.reduce(
            (total, answer) => total + answer.awarded_points,
            0
        );

        const totalPoints = exam.exam_questions.reduce(
            (total, question) => total + question.points,
            0
        );
        // =========================
        // Save attempt
        // =========================
        const { data: attempt, error: attemptError } = await supabase
            .from("exam_attempts")
            .insert({
                exam_id: examId,
                student_id: student.id,
                score,
                completed_at: new Date().toISOString(),
            })
            .select("id, score, completed_at")
            .single();
        if (attemptError) {
            return res.status(500).json({
                message: attemptError.message,
            });
        }
        // =========================
        // Save answers
        // =========================
        const { error: answersError } = await supabase
            .from("exam_answers")
            .insert(
                scoredAnswers.map((answer) => ({
                    ...answer,
                    attempt_id: attempt.id,
                }))
            );
        if (answersError) {
            await supabase
                .from("exam_attempts")
                .delete()
                .eq("id", attempt.id);
            return res.status(500).json({
                message: answersError.message,
            });
        }
        // =========================
        // Update student points
        // =========================
        const { data: currentStudent, error: currentStudentError } =
            await supabase
                .from("students")
                .select('"student-points", points')
                .eq("id", student.id)
                .single();
        if (currentStudentError || !currentStudent) {
            return res.status(500).json({
                message: "فشل الحصول على نقاط الطالب",
            });
        }
        const currentStudentPoints =
            Number(currentStudent["student-points"]) || 0;
        const currentTotalPoints =
            Number(currentStudent.points) || 0;
        // نقاط الطالب التي حصل عليها فعليًا
        const newStudentPoints =
            currentStudentPoints + score;
        // إجمالي النقاط المتاحة التي دخلت في حساب المستوى
        const newTotalPoints =
            currentTotalPoints + totalPoints;
        const { error: pointsError } = await supabase
            .from("students")
            .update({
                "student-points": newStudentPoints,
                points: newTotalPoints,
            })
            .eq("id", student.id);
        if (pointsError) {
            return res.status(500).json({
                message: pointsError.message,
            });
        }
        // =========================
        // Response
        // =========================
        return res.json({
            attempt,
            score,
            totalPoints,
            newStudentPoints,
            newTotalPoints,
            questionResults: scoredAnswers.map((answer) => ({
                questionId: answer.question_id,
                isCorrect: answer.is_correct,
            })),
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};
