import db from "@/utils/db";

export async function GET() {
  try {
    const [rows] = await db.query(
      "SELECT * FROM keywords WHERE keyword_end IS NOT NULL"
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
