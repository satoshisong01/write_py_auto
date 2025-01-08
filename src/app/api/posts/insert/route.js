// app/api/posts/insert/route.js
import db from "@/utils/db";

export async function POST(request) {
  try {
    const {
      write_date,
      username,
      link,
      write_mark,
      py_date,
      py_mark,
      naver_mark,
      // 추가된 필드
      title,
      used_keyword,
    } = await request.json();

    // DB Insert
    const [result] = await db.execute(
      `
      INSERT INTO your_table_name
      (write_date, username, link, write_mark, py_date, py_mark, naver_mark, title, used_keyword)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        write_date,
        username,
        link,
        write_mark,
        py_date,
        py_mark,
        naver_mark,
        title,
        used_keyword,
      ]
    );

    return Response.json({
      success: true,
      message: "데이터가 성공적으로 저장되었습니다.",
      insertId: result.insertId,
    });
  } catch (error) {
    console.error("API Insert Error:", error);
    return Response.json(
      { success: false, message: "데이터베이스 오류", error: error.message },
      { status: 500 }
    );
  }
}
