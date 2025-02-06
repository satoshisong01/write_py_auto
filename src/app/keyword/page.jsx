"use client";

import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";

export default function KeywordPage() {
  const [keywords, setKeywords] = useState([]); // DB에 저장된 키워드 목록 상태
  const [currentPage, setCurrentPage] = useState(1); // 현재 페이지 상태
  const [uploadedKeywords, setUploadedKeywords] = useState([]); // 엑셀에서 읽어온 키워드 목록 (임시)
  const [message, setMessage] = useState(""); // 사용자 메시지 상태
  const [selectedItems, setSelectedItems] = useState(new Set()); // 체크박스 선택 상태
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const itemsPerPage = 100; // 페이지당 아이템 수

  useEffect(() => {
    fetchKeywordsFromDB();
  }, []);

  // 엑셀 파일 업로드 핸들러
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0]; // 첫 번째 시트를 사용
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        // 각 행을 { keyword, first_keyword } 객체로 변환
        // A열: keyword, B열: "O"이면 first_keyword: "O", 아니면 null
        const parsedKeywords = jsonData
          .map((row) => ({
            keyword: row[0],
            first_keyword: row[1] === "O" ? "O" : null,
            // DB나 목록에서 고유한 값을 위해 id 추가 (실제 환경에 맞게 변경하세요)
            id: row[0] + Math.random().toString(36).substr(2, 9),
          }))
          .filter((item) => item.keyword); // keyword가 있는 행만 사용

        setUploadedKeywords(parsedKeywords); // 서버에 저장할 데이터를 임시 상태에 저장
        setMessage(`총 ${parsedKeywords.length}개의 키워드가 불러와졌습니다.`);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setMessage("파일을 선택해주세요.");
    }
  };

  // DB에 저장하는 핸들러
  const handleSaveToDB = () => {
    if (uploadedKeywords.length === 0) {
      alert("저장할 키워드가 없습니다.");
      return;
    }

    fetch("/api/keywords/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // keyword와 first_keyword가 모두 포함된 데이터를 전송
      body: JSON.stringify({ keywords: uploadedKeywords }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("데이터가 성공적으로 저장되었습니다!");
          fetchKeywordsFromDB(); // 저장 후 DB 재조회
        } else {
          console.error("Failed to save data:", data.message);
        }
      })
      .catch((error) => {
        console.error("Error saving data:", error.message);
      });
  };

  // DB에서 키워드 목록을 가져오는 함수
  const fetchKeywordsFromDB = () => {
    fetch("/api/keywords/fetch")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setKeywords(data.data);
        } else {
          console.error("Failed to fetch keywords");
        }
      });
  };

  // 선택된 항목 삭제 핸들러
  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) {
      alert("삭제할 항목을 선택해주세요.");
      return;
    }

    fetch("/api/keywords/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedItems) }),
    }).then(() => {
      alert("선택된 항목이 삭제되었습니다.");
      fetchKeywordsFromDB();
      setSelectedItems(new Set());
    });
  };

  // 개별 체크박스 상태 토글
  const handleCheckboxChange = (id) => {
    const updatedSelectedItems = new Set(selectedItems);
    if (updatedSelectedItems.has(id)) {
      updatedSelectedItems.delete(id);
    } else {
      updatedSelectedItems.add(id);
    }
    setSelectedItems(updatedSelectedItems);
  };

  // 전체 선택 체크박스 핸들러
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = keywords.map((item) => item.id);
      setSelectedItems(new Set(allIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  // 정렬 핸들러
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // 정렬된 키워드 목록 (페이지네이션 전에 정렬)
  const sortedKeywords = useMemo(() => {
    let sortableItems = [...keywords];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // null 또는 undefined를 빈 문자열로 취급
        if (aVal === null || aVal === undefined) aVal = "";
        if (bVal === null || bVal === undefined) bVal = "";

        // 문자열인 경우 대소문자 구분 없이 비교
        if (typeof aVal === "string" && typeof bVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [keywords, sortConfig]);

  // 페이지네이션용 현재 페이지 데이터
  const currentKeywords = sortedKeywords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // 페이지네이션 관련 변수들
  const totalPages = Math.ceil(sortedKeywords.length / itemsPerPage);
  const visiblePageCount = 10;
  const blockStart =
    Math.floor((currentPage - 1) / visiblePageCount) * visiblePageCount + 1;
  const blockEnd = Math.min(blockStart + visiblePageCount - 1, totalPages);

  // 헬퍼: 정렬 아이콘 표시
  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ▲" : " ▼";
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ marginBottom: "10px" }}>키워드 목록</h1>
      {/* 총 데이터 개수 표시 */}
      <div style={{ marginBottom: "10px", fontWeight: "bold", color: "#333" }}>
        사용 가능 키워드 개수: {keywords.length}개
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label
          htmlFor="excel-upload"
          style={{
            padding: "10px 20px",
            backgroundColor: "#3498db",
            color: "white",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          엑셀 업로드
        </label>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx, .xls"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />

        <button
          onClick={handleSaveToDB}
          style={{
            padding: "7px 10px",
            marginTop: "20px",
            backgroundColor: "#2ecc71",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginLeft: "10px",
          }}
        >
          저장하기
        </button>
        <button
          onClick={handleDeleteSelected}
          style={{
            padding: "10px 20px",
            color: "#fff",
            backgroundColor: "red",
            borderRadius: "5px",
            cursor: selectedItems.size > 0 ? "pointer" : "not-allowed",
            margin: "10px",
          }}
        >
          선택 삭제
        </button>
        {message && (
          <div
            style={{ marginBottom: "20px", color: "green", fontWeight: "bold" }}
          >
            {message}
          </div>
        )}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  selectedItems.size === keywords.length && keywords.length > 0
                }
              />
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
              }}
              onClick={() => handleSort("id")}
            >
              # {renderSortIcon("id")}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
              }}
              onClick={() => handleSort("keyword")}
            >
              키워드 {renderSortIcon("keyword")}
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                cursor: "pointer",
              }}
              onClick={() => handleSort("first_keyword")}
            >
              First Keyword {renderSortIcon("first_keyword")}
            </th>
          </tr>
        </thead>
        <tbody>
          {currentKeywords.map((item, index) => (
            <tr key={item.id}>
              <td style={{ textAlign: "center", width: "50px" }}>
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleCheckboxChange(item.id)}
                />
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {(currentPage - 1) * itemsPerPage + index + 1}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.keyword}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {item.first_keyword || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* 페이지네이션 */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* 첫 페이지 버튼 */}
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          style={{
            margin: "0 5px",
            padding: "5px 10px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            backgroundColor: currentPage === 1 ? "#ecf0f1" : "#fff",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
          }}
        >
          {"<<"}
        </button>
        {/* 이전 블록 버튼 */}
        <button
          onClick={() => handlePageChange(blockStart - 1)}
          disabled={blockStart === 1}
          style={{
            margin: "0 5px",
            padding: "5px 10px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            backgroundColor: blockStart === 1 ? "#ecf0f1" : "#fff",
            cursor: blockStart === 1 ? "not-allowed" : "pointer",
          }}
        >
          {"<"}
        </button>
        {/* 페이지 번호 버튼 */}
        {Array.from(
          { length: blockEnd - blockStart + 1 },
          (_, i) => blockStart + i
        ).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            style={{
              padding: "5px 10px",
              margin: "0 5px",
              backgroundColor: page === currentPage ? "#2ecc71" : "#ecf0f1",
              border: "1px solid #ddd",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            {page}
          </button>
        ))}
        {/* 다음 블록 버튼 */}
        <button
          onClick={() => handlePageChange(blockEnd + 1)}
          disabled={blockEnd === totalPages}
          style={{
            margin: "0 5px",
            padding: "5px 10px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            backgroundColor: blockEnd === totalPages ? "#ecf0f1" : "#fff",
            cursor: blockEnd === totalPages ? "not-allowed" : "pointer",
          }}
        >
          {">"}
        </button>
        {/* 마지막 페이지 버튼 */}
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={{
            margin: "0 5px",
            padding: "5px 10px",
            border: "1px solid #ddd",
            borderRadius: "5px",
            backgroundColor: currentPage === totalPages ? "#ecf0f1" : "#fff",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          }}
        >
          {">>"}
        </button>
      </div>
    </div>
  );
}
