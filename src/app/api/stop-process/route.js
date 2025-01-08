// src/app/api/stop-process/route.js
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
      `${localServerUrl}/stop-automate`,
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
        message: "자동화 작업이 로컬 머신에서 중단되었습니다.",
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
    console.error("자동화 작업 중단 중 오류:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
