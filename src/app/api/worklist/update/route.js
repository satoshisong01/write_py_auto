import db from "@/utils/db";

export async function PUT(req) {
  try {
    const { id, username, password, link, naver_id, naver_password } =
      await req.json();

    // id가 없으면 업데이트 불가
    if (!id) {
      return Response.json(
        { success: false, message: "Missing 'id' field" },
        { status: 400 }
      );
    }

    const query = `
      UPDATE worklist
      SET username = ?, 
          password = ?,
          link = ?,
          naver_id = ?,
          naver_password = ?
      WHERE id = ?
    `;
    const values = [
      username || "",
      password || "",
      link || "",
      naver_id || "",
      naver_password || "",
      id,
    ];

    await db.query(query, values);

    return Response.json({
      success: true,
      message: "Worklist item updated successfully",
    });
  } catch (error) {
    console.error("Update error:", error.message);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
