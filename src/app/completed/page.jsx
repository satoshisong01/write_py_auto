"use client";

import { useState, useEffect } from "react";

export default function CompletedKeywordsPage() {
  const [completedKeywords, setCompletedKeywords] = useState([]); // 목록
  const [message, setMessage] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 페이지 당 표시할 아이템 수
  const itemsPerPage = 100;

  // 1) 페이지 로드시 DB에서 데이터 가져오기
  useEffect(() => {
    fetchCompletedKeywords();
  }, []);

  const fetchCompletedKeywords = async () => {
    try {
      const res = await fetch("/api/posts/fetch"); // DB에서 전체 목록 가져오기
      const data = await res.json();
      if (data.success) {
        setCompletedKeywords(data.data || []);
      } else {
        console.error("데이터 가져오기 실패:", data.message);
      }
    } catch (error) {
      console.error("API 요청 에러:", error);
    }
  };

  // 2) 색인확인하기: 각 title로 검색 -> naver_mark = "O" or "X" -> DB 업데이트 -> state 반영
  const handleNaverIndexCheck = async () => {
    if (!completedKeywords.length) {
      alert("확인할 데이터가 없습니다.");
      return;
    }

    setLoading(true);
    setMessage("색인 확인 중... 잠시만 기다려주세요.");

    const updatedItems = [];

    try {
      for (const item of completedKeywords) {
        // title이 없으면 바로 X 처리
        if (!item.title) {
          await updateNaverMark(item.link, "X");
          updatedItems.push({ ...item, naver_mark: "X" });
          continue;
        }

        // 네이버 검색 API 호출
        const res = await fetch(
          `/api/search-naver?query=${encodeURIComponent(item.title)}`
        );
        const data = await res.json();

        // 검색 결과에 title이 포함되는지 여부
        let isIncluded = false;
        if (data.items && data.items.length > 0) {
          isIncluded = data.items.some((searchItem) =>
            searchItem.title.replace(/<[^>]+>/g, "").includes(item.title)
          );
        }

        const markValue = isIncluded ? "O" : "X";

        // DB 업데이트 -> updateNaverMark
        await updateNaverMark(item.link, markValue);

        // 로컬 state에서 갱신
        updatedItems.push({ ...item, naver_mark: markValue });
      }

      // 모두 처리 후 state 갱신
      setCompletedKeywords(updatedItems);
      setMessage("색인 확인이 완료되었습니다.");
    } catch (error) {
      console.error("색인 확인 중 에러:", error);
      setMessage(`오류 발생: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2-1) DB에 naver_mark 업데이트
  const updateNaverMark = async (link, mark) => {
    try {
      const res = await fetch("/api/posts/updateNaverMark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link, naver_mark: mark }),
      });
      const data = await res.json();
      if (!data.success) {
        console.error("DB 업데이트 실패:", data.message);
      }
    } catch (error) {
      console.error("DB 업데이트 에러:", error);
    }
  };

  // 개별 체크박스 선택/해제
  const handleCheckboxChange = (id) => {
    setSelectedItems((prev) => {
      const updated = new Set(prev);
      updated.has(id) ? updated.delete(id) : updated.add(id);
      return updated;
    });
  };

  // 현재 페이지에 해당하는 아이템만 잘라서 보여줌
  const currentItems = completedKeywords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 날짜+시간 포맷 함수
  function formatDateTime(dateString) {
    if (!dateString) return "";

    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) {
      // dateString이 유효한 날짜가 아니면, 원본 문자열 그대로 리턴
      return dateString;
    }

    // 연도, 월(0부터 시작하므로 +1), 일
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");

    // 시, 분
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");

    // "YYYY-MM-DD HH:mm" 형태로 리턴
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1
        style={{ marginBottom: "10px", fontSize: "24px", fontWeight: "bold" }}
      >
        완료 키워드
      </h1>

      <h1
        style={{ marginBottom: "10px", fontSize: "18px", fontWeight: "bold" }}
      >
        완료 키워드 ({completedKeywords.length}개)
      </h1>

      {/* 색인확인하기 버튼 */}
      <button
        onClick={handleNaverIndexCheck}
        disabled={loading}
        style={{
          marginBottom: "20px",
          padding: "10px 15px",
          backgroundColor: "#27ae60",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        {loading ? "색인확인 중..." : "색인확인하기"}
      </button>

      {/* 안내 메시지 */}
      {message && (
        <div
          style={{ marginBottom: "10px", color: "#27ae60", fontWeight: "bold" }}
        >
          {message}
        </div>
      )}

      {/* 테이블 */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#34495e", color: "#fff" }}>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              <input
                type="checkbox"
                onChange={(e) => {
                  // 전체 선택/해제
                  if (e.target.checked) {
                    // 현재 페이지 항목만 모두 추가
                    const allIds = currentItems.map((item) => item.id);
                    setSelectedItems(new Set(allIds));
                  } else {
                    // 현재 페이지 항목만 제거
                    const newSet = new Set(selectedItems);
                    currentItems.forEach((item) => newSet.delete(item.id));
                    setSelectedItems(newSet);
                  }
                }}
                checked={
                  currentItems.length > 0 &&
                  currentItems.every((item) => selectedItems.has(item.id))
                }
              />
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              사용된 키워드
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>글제목</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              글쓴시간
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>아이디</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>주소</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>글쓰기</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              수집요청시간
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              수집요청
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              색인확인
            </th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((item) => (
            <tr key={item.id}>
              <td style={{ border: "1px solid #ddd", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleCheckboxChange(item.id)}
                />
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.used_keyword || ""}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.title || ""}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.write_date ? formatDateTime(item.write_date) : ""}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.username || ""}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3498db" }}
                  >
                    {item.link}
                  </a>
                ) : (
                  ""
                )}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.write_mark || ""}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.py_date ? formatDateTime(item.py_date) : ""}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.py_mark || ""}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.naver_mark || ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 페이지네이션 */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        {Array.from(
          { length: Math.ceil(completedKeywords.length / itemsPerPage) },
          (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              style={{
                padding: "10px",
                margin: "0 5px",
                backgroundColor: i + 1 === currentPage ? "#2ecc71" : "#ecf0f1",
                border: "1px solid #ddd",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              {i + 1}
            </button>
          )
        )}
      </div>
    </div>
  );
}
