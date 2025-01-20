// pages/api/start-write/route.js

import axios from "axios";
import { NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();

export async function POST() {
  try {
    const localServerUrl = process.env.LOCAL_SERVER_URL;
    const authToken = process.env.AUTH_TOKEN;

    if (!localServerUrl || !authToken) {
      throw new Error(
        "LOCAL_SERVER_URL 또는 AUTH_TOKEN이 설정되지 않았습니다."
      );
    }

    // Step 1: Clear logs
    const clearLogsResponse = await axios.post(
      `${localServerUrl}/clear-logs`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    if (!clearLogsResponse.data.success) {
      throw new Error(`로그 초기화 실패: ${clearLogsResponse.data.message}`);
    }

    // Step 2: start-write 엔드포인트 호출 (automate.js 실행)
    const startWriteResponse = await axios.post(
      `${localServerUrl}/start-write`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (startWriteResponse.data.success) {
      return NextResponse.json({
        success: true,
        message: "글쓰기(automate.js)가 시작되었습니다.",
      });
    } else {
      return NextResponse.json(
        { success: false, message: startWriteResponse.data.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("글쓰기 시작 중 오류:", error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
