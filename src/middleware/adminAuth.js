import crypto from "node:crypto";
const decode = (value) => JSON.parse(Buffer.from(value, "base64url").toString());
export const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Admin authentication required" });
    }
    const token = authHeader.slice("Bearer ".length);
    const parts = token.split(".");
    if (parts.length !== 3 || !process.env.ADMIN_TOKEN_SECRET) {
        return res.status(401).json({ message: "Invalid admin token" });
    }
    try {
        const [header, body, signature] = parts;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.ADMIN_TOKEN_SECRET)
            .update(`${header}.${body}`)
            .digest("base64url");
        const signaturesMatch = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature),
        );
        const payload = decode(body);

        if (!signaturesMatch || payload.role !== "admin" || payload.exp <= Math.floor(Date.now() / 1000)) {
            return res.status(401).json({ message: "Invalid or expired admin token" });
        }

        req.admin = payload;
        return next();
    } catch {
        return res.status(401).json({ message: "Invalid admin token" });
    }
};