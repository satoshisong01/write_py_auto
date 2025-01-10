"use client";

import { useEffect, useState, useRef } from "react";

export default function AutomateLogsPage() {
  const [logContent, setLogContent] = useState("");

  // 1) 스크롤 할 div를 참조할 ref 생성
  const logContainerRef = useRef(null);

  useEffect(() => {
    // 2) 페이지 로드 후 주기적으로 로그를 fetch
    const interval = setInterval(() => {
      fetchLogs();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // 3) 로그 가져오는 함수
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/automate/logs");
      const data = await res.json();
      if (data.success) {
        setLogContent(data.data);
      } else {
        console.error("로그 가져오기 실패:", data.message);
      }
    } catch (error) {
      console.error("로그 요청 에러:", error);
    }
  };

  // 4) logContent가 변할 때마다 자동 스크롤
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logContent]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>자동화 로그 뷰어</h1>
      <div
        ref={logContainerRef} // 5) 여기 ref 연결
        style={{
          marginTop: "20px",
          whiteSpace: "pre-wrap",
          backgroundColor: "#f4f4f4",
          padding: "10px",
          borderRadius: "5px",
          maxHeight: "500px",
          overflowY: "auto",
        }}
      >
        {logContent || "로그가 없습니다."}
      </div>
    </div>
  );
}
