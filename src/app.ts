import express from "express";
import { pool } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();

app.use(express.json());


// ================================
// トップページ
// ================================
app.get("/", (req, res) => {
    res.send("10秒チャレンジ Web API is running!");
});


// ================================
// JWT秘密鍵
// ================================
const JWT_SECRET =
    process.env.JWT_SECRET || "my-secret-key";


// ================================
// ユーザー登録
// ================================
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "name, email and password are required"
            });
        }

        // メールアドレスが既に存在するか確認
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: "Email already exists"
            });
        }

        // パスワードをハッシュ化
        const hashedPassword =
            await bcrypt.hash(password, 10);

        // ユーザーを登録
        const result = await pool.query(
            `INSERT INTO users
                (name, email, password)
             VALUES
                ($1, $2, $3)
             RETURNING
                id, name, email, "createdAt"`,
            [
                name,
                email,
                hashedPassword
            ]
        );

        res.status(201).json(
            result.rows[0]
        );

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ================================
// ログイン
// ================================
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "email and password are required"
            });
        }

        // ユーザー検索
        const result = await pool.query(
            `SELECT
                id,
                name,
                email,
                password
             FROM users
             WHERE email = $1`,
            [email]
        );

        // ユーザーが存在しない
        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // パスワード確認
        const isPasswordCorrect =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        // JWT発行
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        // ログイン成功
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            token: token
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ================================
// JWT認証
// ================================
function authenticateToken(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) {
    const authHeader =
        req.headers.authorization;

    // Authorizationヘッダーがない
    if (!authHeader) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    // Bearer TOKEN
    const token =
        authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "Token required"
        });
    }

    try {
        // JWTを検証
        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        // JWTのユーザー情報を保存
        (req as any).user = decoded;

        next();

    } catch (error) {
        return res.status(403).json({
            error: "Invalid or expired token"
        });
    }
}


// ================================
// スコア登録
// ================================
app.post(
    "/scores",
    authenticateToken,
    async (req, res) => {

        try {
            const { score } = req.body;

            // スコアが整数か確認
            if (!Number.isInteger(score)) {
                return res.status(400).json({
                    error: "score must be an integer"
                });
            }

            // JWTからユーザーIDを取得
            const userId =
                (req as any).user.userId;

            // スコアとユーザーIDを保存
            const result = await pool.query(
                `INSERT INTO scores
                    (score, "userId")
                 VALUES
                    ($1, $2)
                 RETURNING *`,
                [
                    score,
                    userId
                ]
            );

            res.json(
                result.rows[0]
            );

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Database error"
            });
        }
    }
);


// ================================
// スコアランキング取得
// ユーザー情報とスコアを紐づける
// ================================
app.get(
    "/scores",
    authenticateToken,
    async (req, res) => {

        try {
            const result = await pool.query(
                `SELECT
                    scores.id,
                    scores.score,
                    scores."userId",
                    users.name
                 FROM scores
                 LEFT JOIN users
                    ON scores."userId" = users.id
                 ORDER BY
                    scores.score DESC
                 LIMIT 5`
            );

            res.json(
                result.rows
            );

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Database error"
            });
        }
    }
);


// ================================
// サーバー起動
// ================================
const PORT =
    process.env.PORT || 3000;

app.listen(
    Number(PORT),
    "0.0.0.0",
    () => {
        console.log(
            `Server started on port ${PORT}`
        );
    }
);
