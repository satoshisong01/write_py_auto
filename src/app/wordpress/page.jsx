"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function WordPressPage() {
  const [worklist, setWorklist] = useState([]);
  const [uploadedItems, setUploadedItems] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // (A) 새 항목 추가용 상태 (5개 필드 모두 포함)
  const [newItem, setNewItem] = useState({
    username: "",
    password: "",
    link: "",
    naver_id: "",
    naver_password: "",
  });

  // 수정 모드용 상태
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchWorklistFromDB();
  }, []);

  // 1) 전체 목록 조회
  const fetchWorklistFromDB = () => {
    fetch("/api/worklist/fetch")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWorklist(data.data);
        } else {
          console.error("Failed to fetch worklist:", data.message);
        }
      })
      .catch((err) => console.error("Fetch error:", err));
  };

  // 2) 엑셀 파일 업로드 → uploadedItems 설정
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const [columns, ...rows] = jsonData;
      const parsedItems = rows.map((row) =>
        columns.reduce((acc, col, index) => {
          if (col === "네이버ID") col = "네이버아이디";
          if (col === "네이버PW") col = "네이버비밀번호";
          acc[col] = row[index];
          return acc;
        }, {})
      );

      setUploadedItems(parsedItems);
      setMessage(`총 ${parsedItems.length}개의 항목이 불러와졌습니다.`);
    };
    reader.readAsArrayBuffer(file);
  };

  // 3) 엑셀 업로드 후 → DB 저장
  const handleSaveToDB = () => {
    if (!uploadedItems || uploadedItems.length === 0) {
      alert("저장할 항목이 없습니다.");
      return;
    }

    fetch("/api/worklist/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: uploadedItems }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("데이터가 성공적으로 저장되었습니다!");
          fetchWorklistFromDB();
          setUploadedItems([]);
          setMessage("");
        } else {
          console.error("Failed to save worklist:", data.message);
        }
      })
      .catch((error) => console.error("Error saving data:", error.message));
  };

  // (A) (단일) 새 항목 추가
  const handleSaveNewItem = () => {
    // 예시로 아이디와 비밀번호만 필수 처리(원하면 link, naver_id도 필수 가능)
    if (!newItem.username || !newItem.password) {
      alert("아이디와 비밀번호는 필수 입력 항목입니다.");
      return;
    }

    fetch("/api/worklist/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("새로운 항목이 추가되었습니다!");
          fetchWorklistFromDB();
          // 입력 폼 초기화
          setNewItem({
            username: "",
            password: "",
            link: "",
            naver_id: "",
            naver_password: "",
          });
        } else {
          console.error("Failed to add new item:", data.message);
        }
      })
      .catch((error) => console.error("Error adding new item:", error.message));
  };

  // 수정 버튼 클릭
  const handleEditClick = (item) => {
    setEditingItem({ ...item });
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  // (단일) 항목 수정
  const handleSaveEdit = () => {
    if (!editingItem?.id) {
      alert("수정할 항목의 ID가 없습니다.");
      return;
    }

    fetch("/api/worklist/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingItem),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("항목이 수정되었습니다!");
          fetchWorklistFromDB();
          setEditingItem(null);
        } else {
          console.error("Failed to update item:", data.message);
        }
      })
      .catch((error) => console.error("Error updating item:", error.message));
  };

  // 복수 항목 삭제
  const handleDelete = () => {
    const idsToDelete = Array.from(selectedItems);
    if (idsToDelete.length === 0) {
      alert("삭제할 항목을 선택해주세요.");
      return;
    }

    fetch("/api/worklist/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: idsToDelete }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("선택된 항목이 삭제되었습니다.");
          fetchWorklistFromDB();
          setSelectedItems(new Set());
        } else {
          console.error("Failed to delete items:", data.message);
        }
      })
      .catch((error) => console.error("Error deleting data:", error.message));
  };

  // 체크박스 선택
  const handleCheckboxChange = (id) => {
    setSelectedItems((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  };

  // 체크박스 전체 선택
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = currentWorklist.map((item) => item.id);
      setSelectedItems(new Set(allIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  // 페이지네이션
  const currentWorklist = worklist.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ marginBottom: "10px" }}>워프 목록</h1>

      {/* (A) 새 항목 추가 폼 (5개 필드) */}
      <div style={{ marginBottom: "20px" }}>
        <h3>새로운 항목 추가</h3>

        <input
          type="text"
          placeholder="아이디(username)"
          name="username"
          value={newItem.username}
          onChange={(e) => setNewItem({ ...newItem, username: e.target.value })}
          style={{ marginRight: "10px" }}
        />

        <input
          type="text"
          placeholder="비밀번호(password)"
          name="password"
          value={newItem.password}
          onChange={(e) => setNewItem({ ...newItem, password: e.target.value })}
          style={{ marginRight: "10px" }}
        />

        <input
          type="text"
          placeholder="워프(링크)"
          name="link"
          value={newItem.link}
          onChange={(e) => setNewItem({ ...newItem, link: e.target.value })}
          style={{ marginRight: "10px" }}
        />

        <input
          type="text"
          placeholder="네이버ID"
          name="naver_id"
          value={newItem.naver_id}
          onChange={(e) => setNewItem({ ...newItem, naver_id: e.target.value })}
          style={{ marginRight: "10px" }}
        />

        <input
          type="text"
          placeholder="네이버PW"
          name="naver_password"
          value={newItem.naver_password}
          onChange={(e) =>
            setNewItem({ ...newItem, naver_password: e.target.value })
          }
          style={{ marginRight: "10px" }}
        />

        <button
          onClick={handleSaveNewItem}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2ecc71",
            color: "white",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          추가
        </button>
      </div>

      {/* B) 엑셀 업로드 및 삭제/저장 기능 */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleDelete}
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            backgroundColor: "#e74c3c",
            color: "white",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          삭제하기
        </button>
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
            padding: "10px 20px",
            marginLeft: "10px",
            backgroundColor: "#2ecc71",
            color: "white",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          저장하기
        </button>

        {message && (
          <div
            style={{ marginTop: "10px", color: "green", fontWeight: "bold" }}
          >
            {message}
          </div>
        )}
      </div>

      {/* C) 테이블 목록 */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  currentWorklist.length > 0 &&
                  selectedItems.size === currentWorklist.length
                }
              />
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>#</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>아이디</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              비밀번호
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>워프</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              네이버ID
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>
              네이버PW
            </th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>기능</th>
          </tr>
        </thead>

        <tbody>
          {currentWorklist.map((item, index) => (
            <React.Fragment key={item.id}>
              <tr>
                <td style={{ border: "1px solid #ddd", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleCheckboxChange(item.id)}
                  />
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {(currentPage - 1) * itemsPerPage + (index + 1)}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {item.username || "N/A"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {item.password || "N/A"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#3498db", textDecoration: "none" }}
                    >
                      {item.link}
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {item.naver_id || "N/A"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {item.naver_password || "N/A"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  <button
                    onClick={() => handleEditClick(item)}
                    style={{
                      padding: "5px 10px",
                      backgroundColor: "#3498db",
                      color: "white",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    수정
                  </button>
                </td>
              </tr>

              {/* 수정 폼 */}
              {editingItem?.id === item.id && (
                <tr>
                  <td
                    colSpan={8}
                    style={{ backgroundColor: "#f9f9f9", padding: "10px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <label>
                        아이디:
                        <input
                          type="text"
                          value={editingItem.username || ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              username: e.target.value,
                            })
                          }
                          style={{ marginLeft: "10px" }}
                        />
                      </label>
                      <label>
                        비밀번호:
                        <input
                          type="text"
                          value={editingItem.password || ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              password: e.target.value,
                            })
                          }
                          style={{ marginLeft: "10px" }}
                        />
                      </label>
                      <label>
                        워프(링크):
                        <input
                          type="text"
                          value={editingItem.link || ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              link: e.target.value,
                            })
                          }
                          style={{ marginLeft: "10px" }}
                        />
                      </label>
                      <label>
                        네이버ID:
                        <input
                          type="text"
                          value={editingItem.naver_id || ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              naver_id: e.target.value,
                            })
                          }
                          style={{ marginLeft: "10px" }}
                        />
                      </label>
                      <label>
                        네이버PW:
                        <input
                          type="text"
                          value={editingItem.naver_password || ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              naver_password: e.target.value,
                            })
                          }
                          style={{ marginLeft: "10px" }}
                        />
                      </label>

                      <div style={{ marginTop: "10px" }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            marginRight: "5px",
                            padding: "5px 10px",
                            backgroundColor: "#2ecc71",
                            color: "white",
                            borderRadius: "3px",
                            cursor: "pointer",
                          }}
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#e74c3c",
                            color: "white",
                            borderRadius: "3px",
                            cursor: "pointer",
                          }}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* 페이지네이션 */}
      <div style={{ marginTop: "20px" }}>
        {Array.from(
          { length: Math.ceil(worklist.length / itemsPerPage) },
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
