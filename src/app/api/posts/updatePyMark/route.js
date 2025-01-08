// app/api/posts/updatePyMark/route.js  (Next.js 13 예시)
import db from "@/utils/db";

export async function POST(request) {
  try {
    const { link, py_date, py_mark } = await request.json();

    // link로 DB에서 해당 레코드를 찾아 py_date, py_mark 업데이트
    const [result] = await db.execute(
      `
      UPDATE your_table_name
      SET py_date = ?, py_mark = ?
      WHERE link = ?
      `,
      [py_date, py_mark, link]
    );

    // result.affectedRows 등을 통해 업데이트가 제대로 됐는지 확인
    if (result.affectedRows > 0) {
      return Response.json({
        success: true,
        message: "py_date, py_mark가 업데이트되었습니다.",
      });
    } else {
      return Response.json({
        success: false,
        message: "해당 link에 해당하는 레코드를 찾지 못했습니다.",
      });
    }
  } catch (error) {
    console.error("updatePyMark API Error:", error);
    return Response.json(
      { success: false, message: "DB 오류", error: error.message },
      { status: 500 }
    );
  }
}
