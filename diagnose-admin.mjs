// اختبار مسار الأدمن الكامل عبر الـ API كما يفعل المتصفح بالضبط
const base = "http://localhost:5000/api/admin";

// 1) تسجيل دخول الأدمن
const loginResponse = await fetch(`${base}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
console.log("Login Status:", loginResponse.status);
const loginResult = await loginResponse.json();
if (!loginResponse.ok) {
    console.log("Login failed:", loginResult.message);
    process.exit(1);
}
const token = loginResult.token;
console.log("Login: نجح");

// 2) جلب الداشبورد
const dashResponse = await fetch(`${base}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
});
console.log("Dashboard Status:", dashResponse.status);
const text = await dashResponse.text();
try {
    const result = JSON.parse(text);
    console.log("Overview:", JSON.stringify(result.overview));
    console.log("Students count:", result.students?.length);
} catch {
    console.log("Raw response:", text.slice(0, 500));
}