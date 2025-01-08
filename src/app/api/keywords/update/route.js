import db from "@/utils/db";

export async function POST(req) {
  try {
    // 요청 본문에서 키워드 추출
    const { keyword } = await req.json();

    if (!keyword) {
      return Response.json(
        { success: false, message: "키워드를 입력해주세요." },
        { status: 400 }
      );
    }

    // 데이터베이스에서 키워드 업데이트
    const [result] = await db.execute(
      "UPDATE keywords SET keyword_end = 1 WHERE keyword = ?",
      [keyword]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "업데이트할 키워드를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "키워드가 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("Database update error:", error);
    return Response.json(
      { success: false, message: "Database error", error: error.message },
      { status: 500 }
    );
  }
}
