// app/api/get-links/route.js

import { NextResponse } from "next/server";
import db from "@/utils/db"; // 데이터베이스 연결 유틸리티
import dotenv from "dotenv";

dotenv.config();

/**
 * 인증 검증 함수
 */
const verifyAuth = (req) => {
  const authHeader = req.headers.get("Authorization");
  const token = process.env.AUTH_TOKEN;

  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return false;
  }
  return true;
};

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // 데이터베이스 쿼리 실행
    const [rows] = await db.execute(`
      SELECT username, link
      FROM your_table_name
      WHERE py_mark IS NULL OR py_mark != 'O'
      ORDER BY write_date DESC
    `);

    // 링크 배열 추출
    const links = rows.map((row) => ({
      username: row.username,
      url: row.link,
    }));

    return NextResponse.json({ success: true, links }, { status: 200 });
  } catch (error) {
    console.error("API Fetch Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "데이터베이스 오류",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
