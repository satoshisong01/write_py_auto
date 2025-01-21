// app/api/get-time/route.js

import { NextResponse } from "next/server";
import db from "@/utils/db"; // DB 연결 유틸
import dotenv from "dotenv";

dotenv.config();

/**
 * 인증 검증 함수
 */
function verifyAuth(request) {
  const authHeader = request.headers.get("Authorization");
  const token = process.env.AUTH_TOKEN;
  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return false;
  }
  return true;
}

/**
 * GET /api/get-time
 *  - time_setting 테이블에서 한 건(예: LIMIT 1)을 읽어와 반환
 *  - 인증 필요
 */
export async function GET(request) {
  // 1) 인증 체크
  if (!verifyAuth(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // 2) time_setting 테이블에서 한 건 조회 (단 하나만 있다고 가정)
    const [rows] = await db.execute("SELECT * FROM time_setting LIMIT 1");

    if (rows && rows.length > 0) {
      // 데이터를 성공적으로 가져옴
      return NextResponse.json({
        success: true,
        data: rows[0],
      });
    } else {
      // 데이터가 없는 경우
      return NextResponse.json({
        success: true,
        data: {},
        message: "타임 세팅값이 존재하지 않습니다.",
      });
    }
  } catch (error) {
    console.error("GET /api/get-time Error:", error);
    return NextResponse.json(
      { success: false, message: "데이터베이스 오류", error: error.message },
      { status: 500 }
    );
  }
}
