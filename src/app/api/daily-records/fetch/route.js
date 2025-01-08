// app/api/daily-records/fetch/route.js
import db from "@/utils/db";

export async function GET(req) {
  try {
    // 데이터베이스에서 모든 기록 조회
    const [rows] = await db.execute(
      `
      SELECT *
      FROM daily_work_records
      WHERE DATE(created_at) = CURDATE()
      ORDER BY created_at DESC, username ASC
      `
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: rows,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Database fetch error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "데이터베이스 오류",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
