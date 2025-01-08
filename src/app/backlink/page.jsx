"use client";

import { useState } from "react";

export default function Home() {
  //   const [query, setQuery] = useState("");
  //   const [results, setResults] = useState([]);
  //   const [loading, setLoading] = useState(false);

  //   const handleSearch = async () => {
  //     if (!query) return alert("검색어를 입력하세요.");
  //     setLoading(true);

  //     try {
  //       const response = await fetch(
  //         `/api/search-naver?query=${encodeURIComponent(query)}`
  //       );
  //       const data = await response.json();
  //       console.log("data", data);

  //       if (data.items) {
  //         setResults(data.items);

  //         // 검색어가 결과 제목이나 설명에 포함되었는지 확인
  //         const match = data.items.some(
  //           (item) =>
  //             item.title.replace(/<[^>]+>/g, "").includes(query.trim()) || // 제목에 검색어 포함 여부
  //             item.description.includes(query.trim()) // 설명에 검색어 포함 여부
  //         );

  //         if (match) {
  //           alert("O");
  //         } else {
  //           alert("X");
  //         }
  //       } else {
  //         alert("결과를 가져오지 못했습니다.");
  //       }
  //     } catch (error) {
  //       alert("오류 발생: " + error.message);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  return (
    <div>
      <h1>준비중</h1>
      {/* <input
        type="text"
        placeholder="검색어 또는 URL을 입력하세요"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? "검색 중..." : "검색"}
      </button>

      <div>
        {results.length > 0 && (
          <ul>
            {results.map((item, index) => (
              <li key={index}>
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {item.title.replace(/<[^>]+>/g, "")}
                </a>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div> */}
    </div>
  );
}
