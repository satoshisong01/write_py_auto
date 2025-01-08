// src/app/api/start-process/route.js
import path from "path";
import { spawn } from "child_process";
import fs from "fs";

/**
 * 전역 childProcess 레퍼런스
 * (주의: 서버가 scale-out(수평 확장) 되면 프로세스가 여러 대로 나눠짐 → 이 경우엔 DB같은 공유 저장소 필요)
 */
global.childProcessRef = null;

export async function POST() {
  try {
    // run_automate.js 경로
    const scriptPath = path.join(
      process.cwd(),
      "src",
      "app",
      "scripts",
      "run_automate.js"
    );
    const logDirPath = path.join(process.cwd(), "logs");
    const logFilePath = path.join(logDirPath, "automate.log");

    // logs 폴더 확인
    if (!fs.existsSync(logDirPath)) {
      fs.mkdirSync(logDirPath, { recursive: true });
    }

    // 기존 로그파일 비우기
    fs.writeFileSync(logFilePath, "", "utf-8");

    // 파일열기 (append 모드)
    const out = fs.openSync(logFilePath, "a");
    const err = fs.openSync(logFilePath, "a");

    // 프로세스 스폰
    const spawnedProcess = spawn("node", [scriptPath], {
      detached: true,
      stdio: ["ignore", out, err],
    });
    spawnedProcess.unref();

    // (A) 글로벌에 저장
    global.childProcessRef = spawnedProcess;

    return new Response(
      JSON.stringify({
        success: true,
        message: "자동화 작업이 백그라운드에서 시작되었습니다.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("자동화 작업 실행 중 오류:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "자동화 작업 실행 중 오류 발생",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
