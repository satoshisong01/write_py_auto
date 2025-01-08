import db from "@/utils/db"; // db 연결 파일 가져오기

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
      item["아이디"] || "",
      item["비밀번호"] || "",
      item["워프"] || "",
      item["네이버아이디"] || "",
      item["네이버비밀번호"] || "",
    ]);

    const query = `
        INSERT INTO worklist (username, password, link, naver_id, naver_password)
        VALUES ?
        ON DUPLICATE KEY UPDATE 
        password = VALUES(password), 
        link = VALUES(link), 
        naver_id = VALUES(naver_id), 
        naver_password = VALUES(naver_password)
    `;

    console.log("Executing query:", query);
    console.log("Values:", values);

    await db.query(query, [values]);

    return Response.json({
      success: true,
      message: "Worklist saved successfully",
    });
  } catch (error) {
    console.error("Database save error:", error.message);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
