import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ========================================
// JWT認証ミドルウェア
// ========================================
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Authorizationヘッダーを取得
    const authHeader = req.headers.authorization;

    // JWTが送られていない
    if (!authHeader) {
        return res.status(401).json({
            error: "認証が必要です"
        });
    }

    // Bearer トークンを取得
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "JWTトークンがありません"
        });
    }

    // JWT_SECRETを取得
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return res.status(500).json({
            error: "JWT_SECRETが設定されていません"
        });
    }

    try {
        // JWTを検証
        const decoded = jwt.verify(token, secret);

        // 認証成功
        console.log("JWT認証成功:", decoded);

        next();

    } catch (error) {
        return res.status(401).json({
            error: "無効なJWTトークンです"
        });
    }
}
