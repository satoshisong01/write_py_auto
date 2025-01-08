import db from "@/utils/db";

export async function POST(request) {
  try {
    // 클라이언트에서 JSON으로 보낸 { link, naver_mark }를 받습니다.
    const { link, naver_mark } = await request.json();

    // link가 일치하는 레코드의 naver_mark 컬럼을 업데이트
    const [result] = await db.execute(
      `
      UPDATE your_table_name
      SET naver_mark = ?
      WHERE link = ?
      `,
      [naver_mark, link]
    );

    if (result.affectedRows > 0) {
      return Response.json({
        success: true,
        message: "naver_mark가 DB에 업데이트 되었습니다.",
      });
    } else {
      return Response.json({
        success: false,
        message: "해당 link에 해당하는 레코드를 찾지 못했습니다.",
      });
    }
  } catch (error) {
    console.error("updateNaverMark API Error:", error);
    return Response.json(
      { success: false, message: "DB 오류", error: error.message },
      { status: 500 }
    );
  }
}
