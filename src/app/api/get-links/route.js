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
    // 1) 현재 UTC 시간에서 9시간 더해 KST 기준 '오늘 날짜' 구하기
    const nowUtc = new Date(); // 현재 UTC 시각 (JS Date는 내부적으로 UTC로 관리)
    nowUtc.setHours(nowUtc.getHours() + 9); // +9시간 → KST
    // KST 날짜 포맷(YYYY-MM-DD)
    const year = nowUtc.getFullYear();
    const month = String(nowUtc.getMonth() + 1).padStart(2, "0");
    const day = String(nowUtc.getDate()).padStart(2, "0");
    const kstDateString = `${year}-${month}-${day}`; // 예: "2025-01-21"

    // 2) SQL 쿼리
    //  - 기존 조건: (py_mark IS NULL OR py_mark != 'O')
    //  - 추가 조건: DATE(write_date) = kstDateString
    const [rows] = await db.execute(
      `
        SELECT username, link
        FROM your_table_name
        WHERE (py_mark IS NULL OR py_mark != 'O')
          AND DATE(write_date) = ?
        ORDER BY write_date DESC
      `,
      [kstDateString]
    );

    // 3) links 배열 변환
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
