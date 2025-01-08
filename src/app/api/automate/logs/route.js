import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // 로그 파일 경로
    const logFilePath = path.join(process.cwd(), "logs", "automate.log");

    if (!fs.existsSync(logFilePath)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "로그 파일이 없습니다.",
        }),
        { status: 404 }
      );
    }

    // 파일 전체 내용을 문자열로 읽기
    const content = fs.readFileSync(logFilePath, "utf-8");

    return new Response(
      JSON.stringify({
        success: true,
        data: content,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("로그 파일 조회 에러:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "로그 파일 조회 중 오류",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
