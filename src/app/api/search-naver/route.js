//app/api/search-naver
import axios from "axios";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) {
    return new Response(
      JSON.stringify({ error: "Query parameter is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const response = await axios.get(
      "https://openapi.naver.com/v1/search/webkr.json",
      {
        params: { query, display: 100 },
        headers: {
          "X-Naver-Client-Id": process.env.NEXT_PUBLIC_NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET,
        },
      }
    );

    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
