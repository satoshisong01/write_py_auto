"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function KeywordPage() {
  const [keywords, setKeywords] = useState([]); // 키워드 목록 상태
  const [currentPage, setCurrentPage] = useState(1); // 현재 페이지 상태
  const [uploadedKeywords, setUploadedKeywords] = useState([]); // 임시 업로드된 키워드 상태
  const [message, setMessage] = useState(""); // 사용자 메시지 상태
  const [selectedItems, setSelectedItems] = useState(new Set()); // 체크박스 상태
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
        const parsedKeywords = jsonData.flat().filter((item) => item); // 배열 평탄화 및 빈 값 제거

        setUploadedKeywords(parsedKeywords); // 화면에는 표시 안 함
        setMessage(`총 ${parsedKeywords.length}개의 키워드가 불러와졌습니다.`); // 메시지 상태 설정
      };
      reader.readAsArrayBuffer(file);
    } else {
      setMessage("파일을 선택해주세요."); // 파일이 없을 경우 메시지 설정
    }
  };

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
      body: JSON.stringify({ keywords: uploadedKeywords }), // 업로드된 키워드 전송
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("데이터가 성공적으로 저장되었습니다!");
          fetchKeywordsFromDB(); // 저장 후 키워드 재조회
        } else {
          console.error("Failed to save data:", data.message);
        }
      })
      .catch((error) => {
        console.error("Error saving data:", error.message);
      });
  };

  const fetchKeywordsFromDB = () => {
    fetch("/api/keywords/fetch")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setKeywords(data.data); // 저장된 키워드 상태에 설정
        } else {
          console.error("Failed to fetch keywords");
        }
      });
  };

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

  const handleCheckboxChange = (id) => {
    const updatedSelectedItems = new Set(selectedItems);
    if (updatedSelectedItems.has(id)) {
      updatedSelectedItems.delete(id);
    } else {
      updatedSelectedItems.add(id);
    }
    setSelectedItems(updatedSelectedItems);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = keywords.map((item) => item.id);
      setSelectedItems(new Set(allIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  // 페이지네이션용 데이터
  const currentKeywords = keywords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page);
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
            marginBottom: "10px",
            marginRight: "10px",
            marginLeft: "10px",
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
                checked={selectedItems.size === keywords.length}
              />
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>#</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>키워드</th>
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
                {item.keyword} {/* 객체의 keyword 필드를 렌더링 */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: "20px" }}>
        {Array.from(
          { length: Math.ceil(keywords.length / itemsPerPage) },
          (_, i) => (
            <button
              key={i}
              onClick={() => handlePageChange(i + 1)}
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
