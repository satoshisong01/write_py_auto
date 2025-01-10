"use client";

import { useState, useEffect, useMemo } from "react";
import pLimit from "p-limit"; // p-limit 라이브러리

// 날짜 필터링을 위한 날짜 선택 컴포넌트
function DateFilter({ label, selectedDate, setSelectedDate, dateOptions }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <label style={{ marginRight: "10px", fontWeight: "bold" }}>
        {label}:
      </label>
      <select
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        style={{ padding: "5px" }}
      >
        <option value="">전체</option>
        {dateOptions.map((date) => (
          <option key={date} value={date}>
            {date}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function CompletedKeywordsPage() {
  const [completedKeywords, setCompletedKeywords] = useState([]); // 전체 목록
  const [filteredKeywords, setFilteredKeywords] = useState([]); // 필터링된 목록
  const [message, setMessage] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" }); // 정렬 상태
  const [writeDateFilter, setWriteDateFilter] = useState(""); // 글쓴시간 필터
  const [collectDateFilter, setCollectDateFilter] = useState(""); // 수집요청시간 필터 (py_date)

  // 페이지 당 표시할 아이템 수
  const itemsPerPage = 100;

  // 1) 페이지 로드시 DB에서 데이터 가져오기
  useEffect(() => {
    fetchCompletedKeywords();
  }, []);

  // 필터 및 정렬 적용
  useEffect(() => {
    applyFilters();
  }, [completedKeywords, writeDateFilter, collectDateFilter]);

  useEffect(() => {
    if (sortConfig.key) {
      applySort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig]);

  // (A) DB에서 전체 목록 가져오기
  const fetchCompletedKeywords = async () => {
    try {
      const res = await fetch("/api/posts/fetch"); // DB에서 전체 목록
      const data = await res.json();
      if (data.success) {
        setCompletedKeywords(data.data || []);
      } else {
        console.error("데이터 가져오기 실패:", data.message);
        setMessage("데이터를 가져오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("API 요청 에러:", error);
      setMessage("데이터를 가져오는데 에러가 발생했습니다.");
    }
  };

  // (B) 색인 확인 로직을 별도 함수로 분리
  //     itemsToCheck: 검사 대상 아이템 배열
  //     -> 네이버 검색 API 호출 -> DB 업데이트 -> state 반영
  const checkNaverIndex = async (itemsToCheck) => {
    if (!itemsToCheck.length) {
      alert("확인할 데이터가 없습니다.");
      return;
    }

    setLoading(true);
    setMessage("색인 확인 중... 잠시만 기다려주세요.");

    const updatedItems = [];
    const concurrencyLimit = 5; // 동시에 처리할 요청 수 제한
    const limit = pLimit(concurrencyLimit);

    try {
      const promises = itemsToCheck.map((item) =>
        limit(async () => {
          // title이 없으면 바로 X 처리
          if (!item.title) {
            await updateNaverMark(item.link, "X");
            return { ...item, naver_mark: "X" };
          }

          // 네이버 검색 API 호출 (결과 제한 100개)
          const res = await fetch(
            `/api/search-naver?query=${encodeURIComponent(
              item.title
            )}&limit=100`
          );
          const data = await res.json();

          // 검색 결과에 item.title이 들어있는지 여부
          let isIncluded = false;
          if (data.items && data.items.length > 0) {
            isIncluded = data.items.some((searchItem) =>
              searchItem.title.replace(/<[^>]+>/g, "").includes(item.title)
            );
          }

          const markValue = isIncluded ? "O" : "X";

          // DB에 naver_mark 업데이트
          await updateNaverMark(item.link, markValue);

          return { ...item, naver_mark: markValue };
        })
      );

      // 모든 요청 병렬 처리 후 결과 수집
      const results = await Promise.allSettled(promises);
      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          updatedItems.push(result.value);
        } else {
          console.error("개별 요청 실패:", itemsToCheck[idx], result.reason);
          // 실패한 경우 원래 아이템 그대로 유지
          updatedItems.push(itemsToCheck[idx]);
        }
      });

      // 모두 처리 후 상태 갱신
      // 1) completedKeywords 전체에서 해당 아이템들만 업데이트
      setCompletedKeywords((prev) =>
        prev.map((item) => {
          const updated = updatedItems.find((u) => u.id === item.id);
          return updated ? updated : item;
        })
      );

      // 2) 필터링 목록도 업데이트
      setFilteredKeywords((prev) =>
        prev.map((item) => {
          const updated = updatedItems.find((u) => u.id === item.id);
          return updated ? updated : item;
        })
      );

      setMessage("색인 확인이 완료되었습니다.");
      alert("색인 확인이 완료되었습니다.");
    } catch (error) {
      console.error("색인 확인 중 에러:", error);
      setMessage(`오류 발생: ${error.message}`);
      alert(`오류 발생: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // (B-1) DB에 naver_mark 업데이트
  const updateNaverMark = async (link, mark) => {
    try {
      const res = await fetch("/api/posts/updateNaverMark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link, naver_mark: mark }),
      });
      const data = await res.json();
      if (!data.success) {
        console.log("data", data);
        console.error("DB 업데이트 실패:", data.message);
      }
    } catch (error) {
      console.error("DB 업데이트 에러:", error);
    }
  };

  // (C) 버튼별로 검사 대상을 다르게 지정
  // (C-1) 모든 filteredKeywords를 검사
  const handleNaverIndexCheckAll = () => {
    checkNaverIndex(filteredKeywords);
  };

  // (C-2) py_mark가 null 또는 ''인 항목들만 검사
  const handleNaverIndexCheckPyMarkNull = () => {
    const itemsToCheck = filteredKeywords.filter(
      (item) => item.py_mark == null || item.py_mark === ""
    );
    checkNaverIndex(itemsToCheck);
  };

  // (C-3) py_mark가 'X'인 항목들만 검사
  const handleNaverIndexCheckPyMarkX = () => {
    const itemsToCheck = filteredKeywords.filter(
      (item) => item.py_mark === "X"
    );
    checkNaverIndex(itemsToCheck);
  };

  // 체크박스 선택/해제
  const handleCheckboxChange = (id) => {
    setSelectedItems((prev) => {
      const updated = new Set(prev);
      updated.has(id) ? updated.delete(id) : updated.add(id);
      return updated;
    });
  };

  // 전체 선택/해제
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // 현재 페이지 항목만 추가
      const allIds = currentItems.map((item) => item.id);
      setSelectedItems(new Set([...selectedItems, ...allIds]));
    } else {
      // 현재 페이지 항목만 제거
      const newSet = new Set(selectedItems);
      currentItems.forEach((item) => newSet.delete(item.id));
      setSelectedItems(newSet);
    }
  };

  // 정렬 버튼 클릭
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // 정렬 적용
  const applySort = (dataToSort = filteredKeywords) => {
    const { key, direction } = sortConfig;
    const sortedData = [...dataToSort].sort((a, b) => {
      // null 처리
      if (!a[key]) return 1;
      if (!b[key]) return -1;

      // 날짜 필드인 경우
      if (
        key === "write_date" ||
        key === "collect_request_time" ||
        key === "py_date"
      ) {
        const dateA = new Date(a[key]);
        const dateB = new Date(b[key]);
        if (dateA < dateB) return direction === "asc" ? -1 : 1;
        if (dateA > dateB) return direction === "asc" ? 1 : -1;
        return 0;
      }

      // 문자열/숫자
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredKeywords(sortedData);
  };

  // 필터 적용
  const applyFilters = () => {
    let filtered = [...completedKeywords];

    // 글쓴시간 필터
    if (writeDateFilter) {
      filtered = filtered.filter((item) => {
        if (!item.write_date) return false;
        const itemDate = new Date(item.write_date).toISOString().split("T")[0];
        return itemDate === writeDateFilter;
      });
    }

    // 수집요청시간 필터 (mapped to py_date)
    if (collectDateFilter) {
      filtered = filtered.filter((item) => {
        if (!item.py_date) return false;
        const itemDate = new Date(item.py_date).toISOString().split("T")[0];
        return itemDate === collectDateFilter;
      });
    }

    setFilteredKeywords(filtered);

    // 정렬 상태가 설정되어 있으면 정렬 적용
    if (sortConfig.key) {
      applySort(filtered);
    }
  };

  // 날짜 필터 옵션
  const writeDateOptions = useMemo(() => {
    const dates = completedKeywords
      .map((item) =>
        item.write_date
          ? new Date(item.write_date).toISOString().split("T")[0]
          : null
      )
      .filter((date) => date !== null);
    return Array.from(new Set(dates)).sort((a, b) => new Date(b) - new Date(a));
  }, [completedKeywords]);

  const collectDateOptions = useMemo(() => {
    const dates = completedKeywords
      .map((item) =>
        item.py_date ? new Date(item.py_date).toISOString().split("T")[0] : null
      )
      .filter((date) => date !== null);
    return Array.from(new Set(dates)).sort((a, b) => new Date(b) - new Date(a));
  }, [completedKeywords]);

  // 현재 페이지 항목
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;
    return filteredKeywords.slice(start, end);
  }, [filteredKeywords, currentPage, itemsPerPage]);

  // 날짜+시간 포맷
  function formatDateTime(dateString) {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) {
      return dateString;
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1
        style={{ marginBottom: "10px", fontSize: "24px", fontWeight: "bold" }}
      >
        완료 키워드
      </h1>

      <h2
        style={{ marginBottom: "10px", fontSize: "18px", fontWeight: "bold" }}
      >
        완료 키워드 ({completedKeywords.length}개)
      </h2>

      {/* 색인확인하기 (전체) */}
      <button
        onClick={handleNaverIndexCheckAll}
        disabled={loading}
        style={{
          marginRight: "10px",
          marginBottom: "20px",
          padding: "10px 15px",
          backgroundColor: "#27ae60",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        {loading ? "색인확인 중..." : "색인확인 (전체)"}
      </button>

      {/* 색인확인하기 (py_mark null) */}
      <button
        onClick={handleNaverIndexCheckPyMarkNull}
        disabled={loading}
        style={{
          marginRight: "10px",
          marginBottom: "20px",
          padding: "10px 15px",
          backgroundColor: "#2980b9",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        {loading ? "색인확인 중..." : "색인확인 (빈값)"}
      </button>

      {/* 색인확인하기 (py_mark X) */}
      <button
        onClick={handleNaverIndexCheckPyMarkX}
        disabled={loading}
        style={{
          marginBottom: "20px",
          padding: "10px 15px",
          backgroundColor: "#c0392b",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        {loading ? "색인확인 중..." : "색인확인 (X만)"}
      </button>

      {/* 안내 메시지 */}
      {message && (
        <div
          style={{ marginBottom: "10px", color: "#27ae60", fontWeight: "bold" }}
        >
          {message}
        </div>
      )}

      {/* 날짜 필터링 컴포넌트 */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <DateFilter
          label="글쓴시간"
          selectedDate={writeDateFilter}
          setSelectedDate={setWriteDateFilter}
          dateOptions={writeDateOptions}
        />
        <DateFilter
          label="수집요청시간"
          selectedDate={collectDateFilter}
          setSelectedDate={setCollectDateFilter}
          dateOptions={collectDateOptions}
        />
      </div>

      {/* 테이블 */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#34495e", color: "#fff" }}>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  currentItems.length > 0 &&
                  currentItems.every((item) => selectedItems.has(item.id))
                }
              />
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("used_keyword")}
            >
              사용된 키워드{" "}
              {sortConfig.key === "used_keyword"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("title")}
            >
              글제목{" "}
              {sortConfig.key === "title"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("write_date")}
            >
              글쓴시간{" "}
              {sortConfig.key === "write_date"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("username")}
            >
              아이디{" "}
              {sortConfig.key === "username"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("link")}
            >
              주소{" "}
              {sortConfig.key === "link"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("write_mark")}
            >
              글쓰기{" "}
              {sortConfig.key === "write_mark"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("py_date")}
            >
              수집요청시간{" "}
              {sortConfig.key === "py_date"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("py_mark")}
            >
              수집요청{" "}
              {sortConfig.key === "py_mark"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("naver_mark")}
            >
              색인확인{" "}
              {sortConfig.key === "naver_mark"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
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
          { length: Math.ceil(filteredKeywords.length / itemsPerPage) },
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
