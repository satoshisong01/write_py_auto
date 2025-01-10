// app/api/automate/clear-logs.js

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

/**
 * 인증 검증 함수
 */
const verifyAuth = (request) => {
  const authHeader = request.headers.get("Authorization");
  const token = process.env.AUTH_TOKEN;

  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return false;
  }
  return true;
};

export async function POST(request) {
  // 인증 검증
  if (!verifyAuth(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // 로그 파일 경로 설정
    const logFilePath = path.join(process.cwd(), "automate.log");

    // 로그 파일 초기화
    fs.writeFileSync(logFilePath, "");
    console.log("로그가 성공적으로 초기화되었습니다.");

    return NextResponse.json(
      { success: true, message: "로그가 성공적으로 초기화되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("로그 초기화 중 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: "로그 초기화 실패.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
