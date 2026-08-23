import { supabase } from "../config/supabase.js";
// export const authenticate = async (req, res, next) => {
//     try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//         return res.status(401).json({
//         message: "Authentication required",
//         });
//     }
//     const token = authHeader.split(" ")[1];
//     const {
//         data: { user },
//         error,
//     } = await supabase.auth.getUser(token);
//     if (error || !user) {
//         return res.status(401).json({
//         message: "Invalid or expired token",
//         });
//     }
//     req.user = user;
//     next();
//     } catch (error) {
//     return res.status(500).json({
//         message: "Authentication failed",
//     });
//     }
// };
export const authenticate = async (req, res, next) => {
    try {
        console.log("========== AUTHENTICATE ==========")
        const authHeader = req.headers.authorization
        console.log("AUTH HEADER EXISTS:", !!authHeader)
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("❌ NO BEARER TOKEN")
            return res.status(401).json({
                message: "Authentication required",
            })
        }

        const token = authHeader.split(" ")[1]

        console.log("TOKEN EXISTS:", !!token)
        console.log("TOKEN LENGTH:", token?.length)

        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token)

        console.log("AUTH USER EXISTS:", !!user)
        console.log("AUTH USER ID:", user?.id)
        console.log("AUTH USER EMAIL:", user?.email)
        console.log("AUTH ERROR:", error)

        if (error || !user) {
            console.log("❌ INVALID TOKEN")

            return res.status(401).json({
                message: "Invalid or expired token",
            })
        }

        req.user = user

        console.log("✅ AUTHENTICATED")

        next()

    } catch (error) {
        console.error("❌ AUTHENTICATION ERROR:", error)

        return res.status(500).json({
            message: "Authentication failed",
        })
    }
}