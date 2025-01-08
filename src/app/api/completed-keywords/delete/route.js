import db from "@/utils/db";

export async function POST(req) {
  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { success: false, message: "Invalid IDs provided" },
        { status: 400 }
      );
    }

    const query = `DELETE FROM completed_keywords WHERE id IN (?)`;
    await db.query(query, [ids]);

    return Response.json({
      success: true,
      message: "Selected keywords deleted successfully",
    });
  } catch (error) {
    console.error("Database delete error:", error);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
