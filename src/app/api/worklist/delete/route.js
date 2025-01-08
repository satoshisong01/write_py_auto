import db from "@/utils/db";

export async function DELETE(req) {
  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { success: false, message: "No items to delete" },
        { status: 400 }
      );
    }

    const placeholders = ids.map(() => "?").join(", ");
    const query = `DELETE FROM worklist WHERE id IN (${placeholders})`;

    await db.query(query, ids);

    return Response.json({
      success: true,
      message: "Items deleted successfully",
    });
  } catch (error) {
    console.error("Database delete error:", error);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
