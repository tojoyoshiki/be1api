import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "./db";

// ========================================
// POST /auth/register
// ユーザー登録
// ========================================
export async function register(
    name: string,
    email: string,
    password: string
) {
    // メールアドレスが既に登録されているか確認
    const existingUser = await prisma.user.findUnique({
        where: {
            email
        }
    });

    if (existingUser) {
        throw new Error("このメールアドレスは既に登録されています");
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザーをDBに登録
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword
        }
    });

    // パスワードはレスポンスに返さない
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
    };
}


// ========================================
// ログイン
// JWTを発行
// ========================================
export async function login(
    email: string,
    password: string
) {
    // メールアドレスからユーザーを検索
    const user = await prisma.user.findUnique({
        where: {
            email
        }
    });

    // ユーザーが存在しない
    if (!user || !user.password) {
        throw new Error("メールアドレスまたはパスワードが違います");
    }

    // パスワードを照合
    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    // パスワードが違う
    if (!isPasswordCorrect) {
        throw new Error("メールアドレスまたはパスワードが違います");
    }

    // JWT_SECRETを取得
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRETが設定されていません");
    }

    // JWTを発行
    const token = jwt.sign(
        {
            userId: user.id
        },
        secret,
        {
            expiresIn: "1h"
        }
    );

    // ユーザー情報とJWTを返す
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        token
    };
}
