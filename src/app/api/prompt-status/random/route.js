import db from "@/utils/db"; // DB 연결 (가정)

export async function GET() {
  try {
    // 예: MySQL인 경우
    // 1) 전체 프롬프트 개수를 파악
    // 2) RAND() ORDER BY 로 한 개 가져오거나, 자바스크립트에서 random index 뽑기
    // 아래는 MySQL 예시 (RAND() 사용)
    const [rows] = await db.query(`
      SELECT prompt
      FROM prompt_status
      ORDER BY RAND()
      LIMIT 1
    `);

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No prompts found" }),
        { status: 404 }
      );
    }

    const randomPrompt = rows[0].prompt;

    return new Response(
      JSON.stringify({ success: true, prompt: randomPrompt }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching random prompt:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}
