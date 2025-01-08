"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function PromptStatusPage() {
  const [prompts, setPrompts] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set()); // 체크박스 상태
  const [uploadedItems, setUploadedItems] = useState([]);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPromptsFromDB();
  }, []);

  const fetchPromptsFromDB = () => {
    fetch("/api/prompt-status/fetch")
      .then((res) => res.json())
      .then((data) => setPrompts(data.data || []));
  };

  // 체크박스 상태 업데이트
  const handleCheckboxChange = (id) => {
    const updatedSelectedItems = new Set(selectedItems);
    if (updatedSelectedItems.has(id)) {
      updatedSelectedItems.delete(id);
    } else {
      updatedSelectedItems.add(id);
    }
    setSelectedItems(updatedSelectedItems);
  };

  // 전체 체크박스 상태 업데이트
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = prompts.map((item) => item.id);
      setSelectedItems(new Set(allIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  // 선택 항목 삭제
  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) {
      alert("삭제할 항목을 선택해주세요.");
      return;
    }

    fetch("/api/prompt-status/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedItems) }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("선택된 항목이 삭제되었습니다.");
          fetchPromptsFromDB(); // 다시 불러오기
          setSelectedItems(new Set()); // 체크박스 초기화
        } else {
          console.error("Failed to delete items:", data.message);
        }
      });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const [headers, ...items] = rows;

        // 비어 있는 프롬프트 제거
        const parsedItems = items
          .map((row) => ({
            프롬프트: row[0]?.trim(), // 공백 제거
          }))
          .filter((item) => item.프롬프트); // 빈 값 필터링

        setUploadedItems(parsedItems);
        setMessage(`총 ${parsedItems.length}개의 항목이 업로드되었습니다.`);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleUsePrompt = (prompt) => {
    fetch("/api/scripts/updatePrompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("프롬프트가 성공적으로 업데이트되었습니다.");
        } else {
          alert("프롬프트 업데이트 실패: " + data.message);
        }
      });
  };

  const handleSaveToDB = () => {
    fetch("/api/prompt-status/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: uploadedItems }),
    }).then(() => {
      fetchPromptsFromDB();
      setMessage("저장이 완료되었습니다.");
      setUploadedItems([]);
    });
  };

  const currentItems = prompts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ padding: "20px" }}>
      <h1
        style={{ marginBottom: "10px", fontSize: "24px", fontWeight: "bold" }}
      >
        프롬프트 현황
      </h1>
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleDeleteSelected}
          disabled={selectedItems.size === 0}
          style={{
            padding: "10px 20px",
            backgroundColor: selectedItems.size > 0 ? "#e74c3c" : "#bdc3c7",
            color: "#fff",
            borderRadius: "5px",
            cursor: selectedItems.size > 0 ? "pointer" : "not-allowed",
            marginBottom: "10px",
            marginRight: "10px",
          }}
        >
          선택 삭제
        </button>

        <label
          htmlFor="file-upload"
          style={{
            padding: "10px 20px",
            backgroundColor: "#3498db",
            color: "#fff",
            borderRadius: "5px",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          엑셀 업로드
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".xlsx, .xls"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <button
          onClick={handleSaveToDB}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2ecc71",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          저장하기
        </button>
      </div>

      {message && (
        <div
          style={{ marginBottom: "10px", color: "#27ae60", fontWeight: "bold" }}
        >
          {message}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#34495e", color: "#fff" }}>
            <th>
              <input
                type="checkbox"
                checked={
                  selectedItems.size === prompts.length && prompts.length > 0
                }
                onChange={handleSelectAll}
              />
            </th>
            <th style={{ padding: "8px" }}>프롬프트</th>
            <th style={{ padding: "8px" }}>사용</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((item, index) => (
            <tr key={index}>
              <td style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleCheckboxChange(item.id)}
                />
              </td>
              <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                {item.prompt || "N/A"}
              </td>
              <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                <button
                  onClick={() => handleUsePrompt(item.prompt)}
                  style={{
                    padding: "5px 10px",
                    backgroundColor: "#2ecc71",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  사용하기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        {Array.from(
          { length: Math.ceil(prompts.length / itemsPerPage) },
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
