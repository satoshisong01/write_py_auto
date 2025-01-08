import db from "@/utils/db";

export async function GET() {
  try {
    const [rows] = await db.execute("SELECT * FROM prompt_status");
    return Response.json({ success: true, data: rows });
  } catch (error) {
    console.error("Database fetch error:", error);
    return Response.json(
      { success: false, message: "Database error" },
      { status: 500 }
    );
  }
}
