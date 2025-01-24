// app/api/get-yesterday-links/route.js

import { NextResponse } from "next/server";
import db from "@/utils/db"; // 데이터베이스 연결 유틸리티
import dotenv from "dotenv";

dotenv.config();

/**
 * 인증 검증 함수
 * @param {Request} req - 요청 객체
 * @returns {boolean} - 인증 성공 여부
 */
const verifyAuth = (req) => {
  const authHeader = req.headers.get("Authorization");
  const token = process.env.AUTH_TOKEN;

  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return false;
  }
  return true;
};

/**
 * 날짜를 'YYYY-MM-DD HH:MM:SS' 형식으로 포맷하는 함수
 * @param {Date} date - 날짜 객체
 * @returns {string} - 포맷된 날짜 문자열
 */
const formatDateTime = (date) => {
  const pad = (n) => (n < 10 ? "0" + n : n);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`
  );
};

/**
 * GET 요청 핸들러
 * @param {Request} request - 요청 객체
 * @returns {Response} - 응답 객체
 */
export async function GET(request) {
  // 인증 검증
  if (!verifyAuth(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // 현재 날짜의 오늘 00:00:00을 계산
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 오늘 00:00:00

    // 어제 00:00:00을 계산
    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(now.getDate() - 1); // 어제 00:00:00

    // 오늘 00:00:00을 어제의 끝 시각으로 설정 (어제 23:59:59)
    const endOfYesterday = new Date(now);

    // 날짜를 'YYYY-MM-DD HH:MM:SS' 형식으로 포맷
    const formattedStart = formatDateTime(startOfYesterday);
    const formattedEnd = formatDateTime(endOfYesterday);

    // 데이터베이스 쿼리 실행 (범위 조건 사용)
    const [rows] = await db.execute(
      `
      SELECT username, link
      FROM your_table_name
      WHERE (py_mark IS NULL OR py_mark != 'O')
        AND write_date >= ?
        AND write_date < ?
      ORDER BY write_date DESC
      `,
      [formattedStart, formattedEnd]
    );

    // 링크 배열 추출
    const links = rows.map((row) => ({
      username: row.username,
      url: row.link,
    }));

    // 성공 응답 반환
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
