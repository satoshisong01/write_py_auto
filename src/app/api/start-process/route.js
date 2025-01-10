// app/api/start-process/route.js

import axios from "axios";
import { NextResponse } from "next/server";
import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

// 프로세스 상태를 추적하는 전역 변수
let processRunning = false;

export async function POST(request) {
  try {
    const localServerUrl = process.env.LOCAL_SERVER_URL;
    const authToken = process.env.AUTH_TOKEN;

    if (!localServerUrl || !authToken) {
      throw new Error(
        "LOCAL_SERVER_URL 또는 AUTH_TOKEN이 설정되지 않았습니다."
      );
    }

    // 프로세스가 이미 실행 중인지 확인
    if (processRunning) {
      return NextResponse.json(
        { success: false, message: "이미 작업이 실행 중입니다." },
        { status: 400 }
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

    // Step 2: Start automate.py
    processRunning = true; // 프로세스 시작 전 상태 업데이트

    const automationProcess = spawn("python", [
      "automation.py",
      "worklist.json",
    ]);

    automationProcess.stdout.on("data", (data) => {
      console.log(`automation.py stdout: ${data}`);
    });

    automationProcess.stderr.on("data", (data) => {
      console.error(`automation.py stderr: ${data}`);
    });

    automationProcess.on("close", (code) => {
      console.log(`automation.py exited with code ${code}`);
      processRunning = false; // 프로세스 종료 후 상태 초기화
    });

    return NextResponse.json({
      success: true,
      message: "작업이 시작되었습니다!",
    });
  } catch (error) {
    console.error("작업 시작 중 오류:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
