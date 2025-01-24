// app/api/get-time/route.js
import { NextResponse } from "next/server";
import db from "@/utils/db";
import dotenv from "dotenv";

dotenv.config();

function verifyAuth(request) {
  const authHeader = request.headers.get("Authorization");
  const token = process.env.AUTH_TOKEN;
  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return false;
  }
  return true;
}

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // SELECT 시 TIME 컬럼을 HH:MM 형태로 변환
    const [rows] = await db.execute(`
      SELECT
        DATE_FORMAT(js_start, '%H:%i') as js_start,
        DATE_FORMAT(js_end, '%H:%i')   as js_end,
        DATE_FORMAT(py_start, '%H:%i') as py_start,
        DATE_FORMAT(py_end, '%H:%i')   as py_end,
        DATE_FORMAT(after_time, '%H:%i') as after_time,
        post_count,
        cycle_count,
        add_count
      FROM time_setting
      LIMIT 1
    `);

    if (rows && rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: rows[0],
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {},
        message: "타임 세팅값이 존재하지 않습니다.",
      });
    }
  } catch (error) {
    console.error("GET /api/get-time Error:", error);
    return NextResponse.json(
      { success: false, message: "데이터베이스 오류", error: error.message },
      { status: 500 }
    );
  }
}
