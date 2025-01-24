// app/api/time-setting/route.js
import db from "@/utils/db";

export async function GET(request) {
  try {
    // time_setting 테이블에서 첫 번째 설정값 조회 (단일 설정값만 있다고 가정)
    const [rows] = await db.execute("SELECT * FROM time_setting LIMIT 1");
    if (rows && rows.length > 0) {
      return Response.json({
        success: true,
        data: rows[0],
      });
    } else {
      // 데이터가 없는 경우 빈 객체 반환
      return Response.json({
        success: true,
        data: {},
        message: "타임 세팅값이 존재하지 않습니다.",
      });
    }
  } catch (error) {
    console.error("GET /api/time-setting Error:", error);
    return Response.json(
      { success: false, message: "데이터베이스 오류", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const {
      js_start,
      js_end,
      py_start,
      py_end,
      after_time,
      post_count,
      cycle_count,
      add_count,
    } = await request.json();

    // 기존 값이 존재하는지 확인
    const [rows] = await db.execute("SELECT * FROM time_setting LIMIT 1");

    if (rows && rows.length > 0) {
      // 데이터가 있으면 업데이트 (여기서는 id 컬럼을 기준으로 업데이트합니다)
      const id = rows[0].id;
      await db.execute(
        `UPDATE time_setting 
         SET js_start = ?, js_end = ?, py_start = ?, py_end = ?, after_time = ?, post_count = ?, cycle_count = ?, add_count = ?
         WHERE id = ?`,
        [
          js_start,
          js_end,
          py_start,
          py_end,
          after_time,
          post_count,
          cycle_count,
          add_count,
          id,
        ]
      );
      return Response.json({
        success: true,
        message: "타임 세팅이 업데이트되었습니다.",
      });
    } else {
      // 데이터가 없으면 신규 생성
      const [result] = await db.execute(
        `INSERT INTO time_setting 
          (js_start, js_end, py_start, py_end, after_time, post_count, cycle_count, add_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          js_start,
          js_end,
          py_start,
          py_end,
          after_time,
          post_count,
          cycle_count,
          add_count,
        ]
      );
      return Response.json({
        success: true,
        message: "타임 세팅이 저장되었습니다.",
        insertId: result.insertId,
      });
    }
  } catch (error) {
    console.error("POST /api/time-setting Error:", error);
    return Response.json(
      { success: false, message: "데이터베이스 오류", error: error.message },
      { status: 500 }
    );
  }
}
