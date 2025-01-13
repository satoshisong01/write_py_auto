import db from "@/utils/db";
// db는 MySQL 연결 설정이 들어있는 예시 유틸. (mysql2, mariadb 등)

export async function POST(request) {
  try {
    // 1) JSON Body에서 link만 받는다.
    const { link } = await request.json();
    if (!link) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "link is required",
        }),
        { status: 400 }
      );
    }

    // 2) py_date는 현재 시각, py_mark는 "O"로 지정
    const py_date = new Date().toISOString(); // 예: 2025-01-13T04:17:59.123Z
    const py_mark = "O";

    // 3) DB Update (mysql2 예시)
    const [result] = await db.execute(
      `
      UPDATE your_table_name
      SET py_date = ?, py_mark = ?
      WHERE link = ?
      `,
      [py_date, py_mark, link]
    );

    // 4) 결과 확인
    if (result.affectedRows > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "py_date와 py_mark가 현재 시각, O로 업데이트되었습니다.",
        }),
        { status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: "해당 link에 해당하는 레코드를 찾지 못했습니다.",
        }),
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("updatePyMark API Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "DB 오류",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
