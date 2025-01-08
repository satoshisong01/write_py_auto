// src/app/api/stop-process/route.js
export async function POST() {
  try {
    if (!global.childProcessRef) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "실행 중인 프로세스가 없습니다.",
        }),
        { status: 400 }
      );
    }

    // 실제 프로세스 종료
    console.log("프로세스 종료를 시도합니다...");
    global.childProcessRef.kill("SIGINT"); // 혹은 "SIGTERM" 등
    global.childProcessRef = null; // 초기화

    return new Response(
      JSON.stringify({
        success: true,
        message: "자동화 프로세스를 종료했습니다.",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("프로세스 종료 중 오류:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}
