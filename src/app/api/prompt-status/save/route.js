import db from "@/utils/db";

export async function POST(req) {
  try {
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json(
        { success: false, message: "Invalid items data" },
        { status: 400 }
      );
    }

    // 업로드된 프롬프트 리스트
    const prompts = items.map((item) => item["프롬프트"]);

    // 데이터베이스에 있는 프롬프트 확인
    const [existingPrompts] = await db.query(
      "SELECT prompt FROM prompt_status WHERE prompt IN (?)",
      [prompts]
    );

    // 이미 저장된 프롬프트를 제외
    const existingSet = new Set(existingPrompts.map((row) => row.prompt));
    const newPrompts = items.filter(
      (item) => !existingSet.has(item["프롬프트"])
    );

    if (newPrompts.length === 0) {
      return Response.json(
        { success: false, message: "모든 프롬프트가 이미 저장되어 있습니다." },
        { status: 200 }
      );
    }

    // 새 프롬프트만 저장
    const values = newPrompts.map((item) => [item["프롬프트"]]);

    const query = `
      INSERT INTO prompt_status (prompt)
      VALUES ?
    `;

    await db.query(query, [values]);

    return Response.json({
      success: true,
      message: `${newPrompts.length}개의 새로운 프롬프트가 저장되었습니다.`,
    });
  } catch (error) {
    console.error("Database save error:", error);
    return Response.json(
      { success: false, message: "Database error" },
      { status: 500 }
    );
  }
}
