// pages/api/automate/clear-logs.js

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

    const response = await axios.post(
      `${localServerUrl}/clear-logs`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (response.data.success) {
      return NextResponse.json({
        success: true,
        message: "로그가 성공적으로 초기화되었습니다.",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: response.data.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("로그 초기화 중 오류:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
