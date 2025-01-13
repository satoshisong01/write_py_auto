import db from "@/utils/db";

// KST 날짜/시간 문자열을 만들어 주는 헬퍼 함수
function getKSTTimeString() {
  // 1) 현재 로컬 시각
  const now = new Date();

  // 2) now.getTime()은 UTC 기준(1970-01-01)부터의 ms 총합
  //    now.getTimezoneOffset() * 60000을 더해주면 UTC 시각을 ms 로 얻을 수 있음
  //    여기에 9시간(= 9 * 60 * 60000ms)을 더해 KST 시각을 만들 수 있음
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const kstMs = utcMs + 9 * 60 * 60000;

  // 3) KST 시각을 Date 객체로 만들기
  const kstDate = new Date(kstMs);

  // 4) "YYYY-MM-DD HH:mm:ss" 포맷으로 변환
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getDate()).padStart(2, "0");
  const hours = String(kstDate.getHours()).padStart(2, "0");
  const minutes = String(kstDate.getMinutes()).padStart(2, "0");
  const seconds = String(kstDate.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

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

    // 2) py_date를 'YYYY-MM-DD HH:mm:ss' 형태의 KST 문자열로 지정
    const py_date = getKSTTimeString(); // 예: "2025-01-13 13:57:02"
    const py_mark = "O";

    // 3) DB Update
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
          message: "py_date와 py_mark가 (KST 기준) 업데이트되었습니다.",
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
