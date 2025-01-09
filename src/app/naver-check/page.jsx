"use client";

import { useState, useEffect, useMemo } from "react";

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

export default function IndexCheckPage() {
  const [rawData, setRawData] = useState([]); // 원본 데이터
  const [filteredData, setFilteredData] = useState([]); // 필터링된 데이터
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [writeDateFilter, setWriteDateFilter] = useState(""); // 글쓴시간 필터
  const [collectDateFilter, setCollectDateFilter] = useState(""); // 수집요청시간 필터

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null }); // 단일 정렬 상태

  // 페이지 당 표시할 아이템 수 (필요 시 조정)
  const itemsPerPage = 100;
  const [currentPage, setCurrentPage] = useState(1);

  // 1) 페이지 로드시 DB에서 데이터 가져오기
  useEffect(() => {
    fetchData();
  }, []);

  // 2) 필터 및 정렬 적용
  useEffect(() => {
    applyFilters();
  }, [rawData, writeDateFilter, collectDateFilter]);

  useEffect(() => {
    if (sortConfig.key && sortConfig.direction) {
      applySort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/posts/fetch");
      const data = await res.json();
      if (data.success) {
        setRawData(data.data || []);
      } else {
        console.error("데이터 가져오기 실패:", data.message);
        setMessage("데이터를 가져오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("API 요청 에러:", error);
      setMessage("데이터를 가져오는데 에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 3) 필터 적용 함수
  const applyFilters = () => {
    let filtered = [...rawData];

    // 글쓴시간 필터링
    if (writeDateFilter) {
      filtered = filtered.filter((item) => {
        if (!item.write_date) return false;
        const itemDate = new Date(item.write_date).toLocaleDateString("en-CA"); // 'YYYY-MM-DD'
        return itemDate === writeDateFilter;
      });
    }

    // 수집요청시간 필터링
    if (collectDateFilter) {
      filtered = filtered.filter((item) => {
        if (!item.py_date) return false;
        const itemDate = new Date(item.py_date).toLocaleDateString("en-CA"); // 'YYYY-MM-DD'
        return itemDate === collectDateFilter;
      });
    }

    setFilteredData(filtered);

    // 필터 변경 시 페이지를 첫 페이지로 리셋
    setCurrentPage(1);
  };

  // 4) 정렬 적용 함수 (단일 정렬)
  const applySort = () => {
    if (!sortConfig.key || !sortConfig.direction) {
      // 정렬 해제 시 원본 필터링된 데이터로 복원
      setFilteredData(filteredData);
      return;
    }

    const sorted = [...filteredData].sort((a, b) => {
      const { key, direction } = sortConfig;
      if (key === "baseUrl") {
        const aValue = a[key] || "";
        const bValue = b[key] || "";
        if (aValue < bValue) return direction === "asc" ? -1 : 1;
        if (aValue > bValue) return direction === "asc" ? 1 : -1;
        return 0;
      }

      if (key === "oCount") {
        return direction === "asc" ? a.oCount - b.oCount : b.oCount - a.oCount;
      }

      return 0;
    });

    setFilteredData(sorted);
  };

  // 5) 정렬 핸들러: 오름차순 → 내림차순 → 정렬 해제
  const handleSort = (key) => {
    setSortConfig((prevSortConfig) => {
      if (prevSortConfig.key === key) {
        if (prevSortConfig.direction === "asc") {
          return { key, direction: "desc" };
        } else if (prevSortConfig.direction === "desc") {
          return { key: null, direction: null };
        }
      }
      return { key, direction: "asc" };
    });
  };

  // 6) 고유한 날짜 리스트 생성 (useMemo를 사용하여 최적화)
  const writeDateOptions = useMemo(() => {
    const dates = rawData
      .map((item) =>
        item.write_date
          ? new Date(item.write_date).toLocaleDateString("en-CA")
          : null
      )
      .filter((date) => date !== null);
    return Array.from(new Set(dates)).sort((a, b) => new Date(b) - new Date(a));
  }, [rawData]);

  const collectDateOptions = useMemo(() => {
    const dates = rawData
      .map((item) =>
        item.py_date ? new Date(item.py_date).toLocaleDateString("en-CA") : null
      )
      .filter((date) => date !== null);
    return Array.from(new Set(dates)).sort((a, b) => new Date(b) - new Date(a));
  }, [rawData]);

  // 7) 데이터 가공 함수: 그룹화 및 O 마크 카운트
  const processedData = useMemo(() => {
    const grouped = {};

    filteredData.forEach((item) => {
      let baseUrl = "";
      try {
        const url = new URL(item.link);
        baseUrl = `${url.protocol}//${url.hostname}`;
      } catch (e) {
        // invalid URL
        return;
      }

      if (!grouped[baseUrl]) {
        grouped[baseUrl] = { baseUrl, oCount: 0 };
      }

      if (item.naver_mark === "O") {
        grouped[baseUrl].oCount += 1;
      }
    });

    return Object.values(grouped);
  }, [filteredData]);

  // 8) 전체 Naver Mark O Count 계산
  const totalOCount = useMemo(() => {
    return processedData.reduce((total, item) => total + item.oCount, 0);
  }, [processedData]);

  // 9) 정렬된 데이터 처리 (단일 정렬)
  const sortedProcessedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return processedData;
    }

    const sorted = [...processedData].sort((a, b) => {
      const { key, direction } = sortConfig;
      if (key === "baseUrl") {
        if (a.baseUrl < b.baseUrl) return direction === "asc" ? -1 : 1;
        if (a.baseUrl > b.baseUrl) return direction === "asc" ? 1 : -1;
        return 0;
      }

      if (key === "oCount") {
        return direction === "asc" ? a.oCount - b.oCount : b.oCount - a.oCount;
      }

      return 0;
    });
    return sorted;
  }, [processedData, sortConfig]);

  // 10) Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;
    return sortedProcessedData.slice(start, end);
  }, [sortedProcessedData, currentPage, itemsPerPage]);

  // 11) 색인확인하기 버튼 핸들러 (데이터 검증 및 naver_mark 업데이트)
  const handleNaverIndexCheck = async () => {
    if (!rawData.length) {
      alert("확인할 데이터가 없습니다.");
      return;
    }

    setLoading(true);
    setMessage("색인 확인 중... 잠시만 기다려주세요.");

    const updatedItems = [];

    try {
      for (const item of rawData) {
        // title이 없으면 바로 X 처리 (예시 로직)
        if (!item.title) {
          await updateNaverMark(item.link, "X");
          updatedItems.push({ ...item, naver_mark: "X" });
          continue;
        }

        // 네이버 검색 API 호출 (예시)
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
      setRawData(updatedItems);
      setMessage("색인 확인이 완료되었습니다.");
    } catch (error) {
      console.error("색인 확인 중 에러:", error);
      setMessage(`오류 발생: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 12) DB에 naver_mark 업데이트 함수
  const updateNaverMark = async (link, mark) => {
    try {
      const res = await fetch("/api/posts/updateNaverMark", {
        // 업데이트 API 엔드포인트 확인 필요
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

  // 정렬 상태에 따른 표시기 추가
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    if (sortConfig.direction === "asc") return "▲";
    if (sortConfig.direction === "desc") return "▼";
    return "";
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1
        style={{ marginBottom: "10px", fontSize: "24px", fontWeight: "bold" }}
      >
        색인확인 페이지
      </h1>

      <h2
        style={{ marginBottom: "10px", fontSize: "18px", fontWeight: "bold" }}
      >
        색인확인 주소 ({processedData.length}개)
      </h2>

      {/* 전체 Naver Mark O Count 표시 */}
      <div
        style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold" }}
      >
        전체 색인된 갯수: {totalOCount}
      </div>

      {/* 색인확인하기 버튼 */}
      {/* <button
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
      </button> */}

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
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("baseUrl")}
            >
              Base URL {getSortIndicator("baseUrl")}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => handleSort("oCount")}
            >
              색인갯수 {getSortIndicator("oCount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((item) => (
            <tr key={item.baseUrl}>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                <a
                  href={item.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#3498db" }}
                >
                  {item.baseUrl}
                </a>
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.oCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 페이지네이션 */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        {Array.from(
          { length: Math.ceil(sortedProcessedData.length / itemsPerPage) },
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
