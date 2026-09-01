import crypto from "node:crypto";
import { supabase } from "../config/supabase.js";

// توحيد صيغة الاسم العربي قبل الحفظ/المقارنة مع قاعدة البيانات
const normalizeName = (value) =>
    typeof value === "string"
        ? value.normalize("NFC").replace(/\s+/g, " ").trim()
        : "";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const passwordKey = () => crypto.createHash("sha256").update(process.env.ADMIN_TOKEN_SECRET).digest();
const encryptPassword = (password) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", passwordKey(), iv);
    const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString("base64url")).join(".");
};
const decryptPassword = (value) => {
    if (!value) return null;
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    const decipher = crypto.createDecipheriv("aes-256-gcm", passwordKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, "base64url")),
        decipher.final(),
    ]).toString("utf8");
};
const signToken = (payload) => {
    const header = encode({ alg: "HS256", typ: "JWT" });
    const body = encode(payload);
    const content = `${header}.${body}`;
    const signature = crypto
        .createHmac("sha256", process.env.ADMIN_TOKEN_SECRET)
        .update(content)
        .digest("base64url");

    return `${content}.${signature}`;
};
export const logIn = (req, res) => {
    const { password, email } = req.body;
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_TOKEN_SECRET) {
        return res.status(500).json({ message: "Admin authentication is not configured" });
    }
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    const emailMatches = email === process.env.ADMIN_EMAIL;
    const passwordMatches = password === process.env.ADMIN_PASSWORD;
    if (!emailMatches || !passwordMatches) {
        return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = signToken({
        role: "admin",
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
    });
    return res.json({ token, role: "admin" });
};
export const adminDashboard = async (req, res) => {
    try {
        const expirationDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { error: expirationError } = await supabase
            .from("students")
            .update({ status: "unpaid", payment_date: null })
            .eq("status", "paid")
            .lt("payment_date", expirationDate);

        if (expirationError) {
            return res.status(500).json({ message: expirationError.message });
        }

        const { data: students, error } = await supabase
            .from("students")
            .select('id, full_name, "student-points", points, stage, grade, status, payment_date, created_at')
            .order("student-points", { ascending: false });
        if (error) {
            return res.status(500).json({ message: error.message });
        }
        const totalStudents = students.length;
        const totalStudentPoints = students.reduce(
            (total, student) => total + (Number(student["student-points"]) || 0),
            0,
        );
        const totalPossiblePoints = students.reduce(
            (total, student) => total + (Number(student.points) || 0),
            0,
        );
        const paidStudents = students.filter((student) => student.status === "paid").length;
        const growthByMonth = new Map();
        students.forEach((student) => {
            if (!student.created_at) {
                return;
            }
            const month = student.created_at.slice(0, 7);
            growthByMonth.set(month, (growthByMonth.get(month) || 0) + 1);
        });
        let totalStudentsAtMonth = 0;
        const studentGrowth = [...growthByMonth.entries()]
            .sort(([firstMonth], [secondMonth]) => firstMonth.localeCompare(secondMonth))
            .map(([month, newStudents]) => {
                totalStudentsAtMonth += newStudents;
                return {
                    label: month,
                    students: totalStudentsAtMonth,
                };
            });

        const { data: answers, error: answersError } = await supabase
            .from("exam_answers")
            .select("awarded_points, is_correct, exam_questions(topic, points)");

        if (answersError) {
            return res.status(500).json({ message: answersError.message });
        }

        const topicTotals = new Map();
        answers.forEach((answer) => {
            const question = answer.exam_questions;
            if (!question) {
                return;
            }
            const current = topicTotals.get(question.topic) || { earned: 0, possible: 0 };
            current.earned += Number(answer.awarded_points) || 0;
            current.possible += Number(question.points) || 0;
            topicTotals.set(question.topic, current);
        });
        const topicPerformance = [...topicTotals.entries()].map(([topic, totals]) => ({
            topic,
            averagePercentage: totals.possible > 0
                ? Math.round((totals.earned / totals.possible) * 100)
                : 0,
        }));
        const averagePercentage = totalStudents
            ? Math.round(students.reduce((total, student) => {
                const studentPoints = Number(student["student-points"]) || 0;
                const finalPoints = Number(student.points) || 0;
                return total + (finalPoints > 0 ? (studentPoints / finalPoints) * 100 : 0);
            }, 0) / totalStudents)
            : 0;

        const leaderboard = students.map((student, index) => {
            const studentPoints = Number(student["student-points"]) || 0;
            const finalPoints = Number(student.points) || 0;

            return {
                rank: index + 1,
                id: student.id,
                full_name: student.full_name,
                studentPoints,
                finalPoints,
                percentage: finalPoints > 0
                    ? Math.round((studentPoints / finalPoints) * 100)
                    : 0,
                stage: student.stage,
                status: student.status || "unpaid",
                paymentDate: student.payment_date,
            };
        });

        return res.json({
            overview: {
                totalStudents,
                totalStudentPoints,
                totalPossiblePoints,
                paidStudents,
                unpaidStudents: totalStudents - paidStudents,
                averagePercentage,
            },
            studentGrowth,
            topicPerformance,
            students: leaderboard,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getStudentDetails = async (req, res) => {
    try {
        const { data: student, error: studentError } = await supabase
            .from("students")
            .select('id, full_name, parent_phone, area, stage, grade, student_phone, "student-points", points, status, payment_date, password_encrypted, created_at')
            .eq("id", req.params.studentId)
            .single();

        if (studentError || !student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const { data: rankedStudents, error: rankingError } = await supabase
            .from("students")
            .select('id, "student-points"')
            .order("student-points", { ascending: false });

        if (rankingError) {
            return res.status(500).json({ message: rankingError.message });
        }

        return res.json({
            student,
            rank: rankedStudents.findIndex((item) => item.id === student.id) + 1,
            password: decryptPassword(student.password_encrypted),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
export const addStudent = async (req, res) => {
    try {
        const {
            full_name,
            password,
            parent_phone,
            area,
            stage,
            grade,
            student_phone
        } = req.body;
        const normalizedName = normalizeName(full_name);
        if (!normalizedName || !password || !stage || !grade) {
            return res.status(400).json({
            message: "full_name, password, stage, and grade are required",
            });
        }
        const { data: existingStudent, error: existingStudentError } = await supabase
            .from("students")
            .select("id")
            .eq("full_name", normalizedName)
            .maybeSingle();
        if (existingStudentError) {
            return res.status(500).json({ message: existingStudentError.message });
        }
        if (existingStudent) {
            return res.status(409).json({ message: "اسم الطالب مستخدم بالفعل" });
        }
        const internalEmail = `student-${crypto.randomUUID()}@internal.helaha.local`;
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: internalEmail,
            password,
            email_confirm: true,
        });
        if (authError) {
            return res.status(400).json({ message: authError.message });
        }
        const { data: student, error: studentError } = await supabase
            .from("students")
            .insert({
                id: authData.user.id,
                full_name: normalizedName,
                email: internalEmail,
                password_encrypted: encryptPassword(password),
                parent_phone,
                area,
                stage,
                grade,
                student_phone,
                "student-points": 0,
                points: 0,
                status: "unpaid",
                payment_date: null,
            })
            .select("id, full_name, parent_phone, area, stage, grade, student_phone, \"student-points\", points, status, payment_date")
            .single();

        if (studentError) {
            await supabase.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({ message: studentError.message });
        }

        return res.status(201).json({
            message: "تم إضافة الطالب بنجاح",
            student,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
export const addPoints = async (req , res )=>{
    try{
        const studentId = req.body.studentId;
        const { pointsCount = 0, points = 0 } = req.body;
        const earnedPoints = Number(pointsCount);
        const possiblePoints = Number(points);
        if (!studentId || !Number.isFinite(earnedPoints) || !Number.isFinite(possiblePoints)
            || earnedPoints < 0 || possiblePoints < 0 || (earnedPoints === 0 && possiblePoints === 0)) {
            return res.status(400).json({
                message: "studentId and at least one non-negative points value are required",
            });
        }

        const {data , error} = await supabase
            .from("students")
            .select('id, full_name, "student-points", points')
            .eq("id", studentId)
            .single();
        if (error || !data) {
            return res.status(404).json({ message: "Student not found" });
        }

        const { data: student, error: updateError } = await supabase
            .from("students")
            .update({
                "student-points": (Number(data["student-points"]) || 0) + earnedPoints,
                points: (Number(data.points) || 0) + possiblePoints,
            })
            .eq("id", studentId)
            .select('id, full_name, "student-points", points')
            .single();

        if (updateError) {
                console.error("❌ SUPABASE UPDATE ERROR:", updateError);
                return res.status(500).json({
                    message: updateError.message,
                    details: updateError.details,
                    hint: updateError.hint,
                    code: updateError.code,
                });
        }

        return res.json({ message: "Points added successfully", student });

    }catch(error){
    console.error("❌ ADD POINTS ERROR:", error);
    return res.status(500).json({
        message: error.message,
        stack: error.stack,
    });
    }
}
export const createExam = async (req, res) => {
    try {
        const { title, type, stage, grade, duration_minutes, total_points, questions } = req.body;
        const durationMinutes = Number(duration_minutes);
        const totalPoints = Number(total_points);

        if (!title || !type || !stage || !grade || !Number.isInteger(durationMinutes) || durationMinutes <= 0
            || !Number.isInteger(totalPoints) || totalPoints <= 0
            || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                message: "title, type, stage, grade, duration_minutes, total_points, and questions are required",
            });
        }

        const normalizedQuestions = questions.map((question) => ({
            topic: String(question.topic || "").trim(),
            question_text: String(question.question_text || "").trim(),
            points: Number(question.points),
            options: Array.isArray(question.options) ? question.options : [],
            correct_answer: String(question.correct_answer || "").trim(),
        }));
        const questionsPoints = normalizedQuestions.reduce((sum, question) => sum + question.points, 0);

        if (normalizedQuestions.some((question) => (
            !question.topic || !question.question_text || !question.correct_answer
            || !Number.isInteger(question.points) || question.points <= 0
            || question.options.length !== 4
            || question.options.some((option) => !String(option).trim())
        )) || questionsPoints !== totalPoints) {
            return res.status(400).json({
                message: "Every question must be valid and question points must equal total_points",
            });
        }

        const { data: exam, error: examError } = await supabase
            .from("exams")
            .insert({ title: title.trim(), type: type.trim(), stage: stage.trim(), grade: grade.trim(), duration_minutes: durationMinutes, total_points: totalPoints })
            .select("id, title, type, stage, grade, duration_minutes, total_points, created_at")
            .single();

        if (examError) {
            return res.status(500).json({ message: examError.message });
        }

        const { data: examQuestions, error: questionsError } = await supabase
            .from("exam_questions")
            .insert(normalizedQuestions.map((question) => ({ ...question, exam_id: exam.id })))
            .select("id, topic, question_text, points, options, correct_answer");

        if (questionsError) {
            await supabase.from("exams").delete().eq("id", exam.id);
            return res.status(500).json({ message: questionsError.message });
        }

        return res.status(201).json({ exam, questions: examQuestions });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const togglePaymentStatus = async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ message: "studentId is required" });
        }
        const expirationDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
            .from("students")
            .update({ status: "unpaid", payment_date: null })
            .eq("status", "paid")
            .lt("payment_date", expirationDate);

        const { data: student, error: findError } = await supabase
            .from("students")
            .select('id, full_name, status, payment_date')
            .eq("id", studentId)
            .single();
        if (findError || !student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const paid = student.status !== "paid";
        const status = paid ? "paid" : "unpaid";
        const paymentDate = paid ? new Date().toISOString() : null;

        const { data: updatedStudent, error: updateError } = await supabase
            .from("students")
            .update({ status, payment_date: paymentDate })
            .eq("id", studentId)
            .select('id, full_name, status, payment_date')
            .single();

        if (updateError) {
            return res.status(500).json({ message: updateError.message });
        }

        return res.json({ message: "Payment status updated", student: updatedStudent });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};