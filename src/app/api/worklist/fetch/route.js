//app/api/worklist/fetch
import db from "@/utils/db";

export async function GET() {
  try {
    const [rows] = await db.execute(
      "SELECT id, username, password, link, naver_id, naver_password, created_at FROM worklist"
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
