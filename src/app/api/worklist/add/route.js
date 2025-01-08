import db from "@/utils/db"; // DB 연결

export async function POST(req) {
  try {
    const { username, password, link, naver_id, naver_password } =
      await req.json();

    // 간단한 유효성 검사 (아이디/비밀번호 필수)
    if (!username || !password) {
      return Response.json(
        { success: false, message: "아이디와 비밀번호는 필수입니다." },
        { status: 400 }
      );
    }

    // DB에 삽입
    const query = `
      INSERT INTO worklist (username, password, link, naver_id, naver_password)
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [
      username,
      password,
      link || "",
      naver_id || "",
      naver_password || "",
    ];

    await db.query(query, values);

    return Response.json({
      success: true,
      message: "Worklist single item added successfully",
    });
  } catch (error) {
    console.error("Add error:", error.message);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
