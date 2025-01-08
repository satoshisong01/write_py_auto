import db from "@/utils/db";

export async function POST(req) {
  try {
    const { ids } = await req.json(); // 삭제할 항목들의 ID 목록

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { success: false, message: "No items selected for deletion" },
        { status: 400 }
      );
    }

    const placeholders = ids.map(() => "?").join(", ");
    const query = `DELETE FROM prompt_status WHERE id IN (${placeholders})`;

    await db.query(query, ids);

    return Response.json({
      success: true,
      message: "Selected items deleted successfully",
    });
  } catch (error) {
    console.error("Database delete error:", error);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
