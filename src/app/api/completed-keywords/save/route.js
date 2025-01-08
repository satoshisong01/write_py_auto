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

    const values = items.map((item) => [
      item.keyword || "",
      item.post_url || "",
      item.webmaster_id || "",
    ]);

    const query = `
      INSERT INTO completed_keywords (keyword, post_url, webmaster_id)
      VALUES ?
    `;

    await db.query(query, [values]);

    return Response.json({
      success: true,
      message: "Completed keywords saved successfully",
    });
  } catch (error) {
    console.error("Database save error:", error);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
