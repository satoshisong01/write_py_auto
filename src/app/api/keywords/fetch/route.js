import db from "@/utils/db";

export async function GET() {
  try {
    // 데이터베이스에서 키워드 조회
    const [rows] = await db.execute(
      "SELECT * FROM keywords WHERE keyword_end IS NULL"
    );

    return Response.json({ success: true, data: rows });
  } catch (error) {
    console.error("Database fetch error:", error);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
