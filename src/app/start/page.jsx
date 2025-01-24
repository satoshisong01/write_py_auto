"use client";

import { useState, useEffect, useRef } from "react";

export default function StartProcessPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [logContent, setLogContent] = useState("");

  // 타임세팅 관련 상태들
  const [jsStart, setJsStart] = useState("");
  const [jsEnd, setJsEnd] = useState("");
  const [pyStart, setPyStart] = useState("");
  const [pyEnd, setPyEnd] = useState("");
  const [afterTime, setAfterTime] = useState("");
  const [postCount, setPostCount] = useState("");
  const [cycleCount, setCycleCount] = useState("");
  const [addCount, setAddCount] = useState("");

  // 스크롤 컨테이너 참조
  const logContainerRef = useRef(null);

  // 컴포넌트 마운트 후 20초마다 로그 가져오기
  useEffect(() => {
    fetchLogs(); // 초기 로그 가져오기
    const interval = setInterval(fetchLogs, 20000);
    return () => clearInterval(interval);
  }, []);

  // 컴포넌트 마운트 시 타임 세팅 값 불러오기
  useEffect(() => {
    fetchTimeSettings();
  }, []);

  // 로그가 바뀔 때마다 스크롤 자동 최하단으로
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logContent]);

  /**
   * (1) "작업 시작" 버튼 - 기존 로직
   *  -> /api/start-process 로 요청하면 automate.js 후 automation.py까지 모두 진행
   */
  const handleStartProcess = async () => {
    if (isRunning) return; // 이미 작업 중이면 무시
    setIsRunning(true);
    setMessage("전체 프로세스 시작 중...");
    setLogContent("");

    try {
      const response = await fetch("/api/start-process", { method: "POST" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(`오류 발생: ${result.message}`);
        setIsRunning(false);
      } else {
        setMessage("전체 프로세스가 시작되었습니다!");
      }
    } catch (error) {
      setMessage(`에러 발생: ${error.message}`);
      setIsRunning(false);
    }
  };

  /**
   * (2) "작업 중단" 버튼 - 기존 로직
   *  -> /api/stop-process 로 요청
   */
  const handleStopProcess = async () => {
    try {
      const response = await fetch("/api/stop-process", { method: "POST" });
      const result = await response.json();
      if (result.success) {
        setMessage("작업이 중단되었습니다.");
        setIsRunning(false);
      } else {
        setMessage(`중단 실패: ${result.message}`);
      }
    } catch (error) {
      setMessage(`중단 API 오류: ${error.message}`);
    }
  };

  /**
   * (3) "글쓰기 시작" 버튼
   *  -> automate.js 만 실행 (API 라우트: /api/start-write)
   */
  const handleStartWrite = async () => {
    if (isRunning) return; // 이미 작업 중이면 무시
    setIsRunning(true);
    setMessage("글쓰기(automate.js) 시작 중...");
    setLogContent("");

    try {
      const response = await fetch("/api/start-write", { method: "POST" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(`오류 발생: ${result.message}`);
        setIsRunning(false);
      } else {
        setMessage("글쓰기(automate.js)가 시작되었습니다!");
      }
    } catch (error) {
      setMessage(`에러 발생: ${error.message}`);
      setIsRunning(false);
    }
  };

  /**
   * (4) "색인 요청 시작" 버튼
   *  -> automation.py 만 실행 (API 라우트: /api/start-index)
   */
  const handleStartIndex = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setMessage("색인 요청(automation.py) 시작 중...");
    setLogContent("");

    try {
      const response = await fetch("/api/start-index", { method: "POST" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(`오류 발생: ${result.message}`);
        setIsRunning(false);
      } else {
        setMessage("색인 요청(automation.py)이 시작되었습니다!");
      }
    } catch (error) {
      setMessage(`에러 발생: ${error.message}`);
      setIsRunning(false);
    }
  };

  /**
   * (5) 자동화 로그 가져오기
   */
  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/automate/logs?ts=${new Date().getTime()}`, {
        // 캐시 방지
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setLogContent(data.data);
      }
    } catch (error) {
      console.error("로그 요청 에러:", error);
    }
  };

  /**
   * (6) 현재 타임세팅값 불러오기 (GET)
   */
  const fetchTimeSettings = async () => {
    try {
      const res = await fetch("/api/time-setting", { method: "GET" });
      const data = await res.json();
      if (data.success) {
        const settings = data.data;
        setJsStart(settings.js_start || "");
        setJsEnd(settings.js_end || "");
        setPyStart(settings.py_start || "");
        setPyEnd(settings.py_end || "");
        setAfterTime(settings.after_time || "");
        setPostCount(settings.post_count?.toString() || "0");
        setCycleCount(settings.cycle_count?.toString() || "0");
        setAddCount(settings.add_count?.toString() || "0");
      }
    } catch (error) {
      console.error("타임세팅 불러오기 오류:", error);
    }
  };

  /**
   * (7) 타임세팅 저장 (생성/업데이트)
   */
  const handleSaveTimeSettings = async () => {
    // 목표 글쓰기 갯수와 추가 글쓰기 갯수를 합산
    const currentPostCount = parseInt(postCount, 10) || 0;
    const additionalCount = parseInt(addCount, 10) || 0;
    const newPostCount = currentPostCount + additionalCount;

    // 저장할 데이터 객체
    const payload = {
      js_start: jsStart,
      js_end: jsEnd,
      py_start: pyStart,
      py_end: pyEnd,
      after_time: afterTime,
      post_count: newPostCount,
      cycle_count: cycleCount,
      add_count: addCount, // 추가 글쓰기 갯수는 저장 후 초기화
    };

    try {
      const res = await fetch("/api/time-setting", {
        method: "POST", // 백엔드에서는 값이 없다면 생성, 있으면 업데이트하도록 처리
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setPostCount(newPostCount.toString());
        setAddCount("");
        setMessage(
          "타임 세팅 저장 성공! 목표 글쓰기 갯수가 업데이트되었습니다."
        );
      } else {
        setMessage(`타임 세팅 저장 실패: ${result.message}`);
      }
    } catch (error) {
      setMessage(`타임 세팅 저장 에러: ${error.message}`);
    }
  };

  // 깜빡이는 동그라미 스타일
  const circleStyle = {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: isRunning ? "green" : "red", // true=녹색, false=빨강
    marginRight: "10px",
    animation: "blink 1s infinite", // 깜빡 애니메이션
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* (1) 깜빡이는 동그라미 + 상태 텍스트 */}
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        <div style={circleStyle}></div>
        <span style={{ fontSize: "16px", fontWeight: "bold" }}>
          {isRunning ? "작업 중..." : "작업 대기"}
        </span>
      </div>

      {/* (2) 기존 "작업 시작" 버튼 / "작업 중단" 버튼 */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleStartProcess}
          disabled={isRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: isRunning ? "#bdc3c7" : "#2ecc71",
            color: "#fff",
            borderRadius: "5px",
            cursor: isRunning ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          {isRunning ? "작업 중..." : "작업 시작"}
        </button>

        <button
          onClick={handleStopProcess}
          disabled={!isRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: !isRunning ? "#bdc3c7" : "#e74c3c",
            color: "#fff",
            borderRadius: "5px",
            cursor: !isRunning ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          작업 중단
        </button>
      </div>

      {/* (3) 추가 버튼: "글쓰기 시작", "색인 요청 시작" */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleStartWrite}
          disabled={isRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: isRunning ? "#bdc3c7" : "#2980b9",
            color: "#fff",
            borderRadius: "5px",
            cursor: isRunning ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          테스트 시작(글쓰기,색인당일)
        </button>

        <button
          onClick={handleStartIndex}
          disabled={isRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: isRunning ? "#bdc3c7" : "#8e44ad",
            color: "#fff",
            borderRadius: "5px",
            cursor: isRunning ? "not-allowed" : "pointer",
            marginRight: "10px",
          }}
        >
          색인 요청 시작
        </button>
      </div>

      {/* (4) 타임 세팅 입력 폼 */}
      <div
        style={{
          marginBottom: "20px",
          border: "1px solid #ccc",
          padding: "15px",
          borderRadius: "5px",
        }}
      >
        <h2>타임 세팅</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
          {/* 글쓰기 시작 시간 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>글쓰기 시작 시간</label>
            <input
              type="text"
              value={jsStart}
              onChange={(e) => setJsStart(e.target.value)}
              placeholder="예: 09:00"
              style={{ padding: "5px", width: "150px" }}
            />
          </div>
          {/* 글쓰기 종료 시간 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>글쓰기 종료 시간</label>
            <input
              type="text"
              value={jsEnd}
              onChange={(e) => setJsEnd(e.target.value)}
              placeholder="예: 18:00"
              style={{ padding: "5px", width: "150px" }}
              readOnly // 수정 불가
            />
          </div>
          {/* 색인 요청 시간 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>색인 요청 시간</label>
            <input
              type="text"
              value={pyStart}
              onChange={(e) => setPyStart(e.target.value)}
              placeholder="예: 18:05"
              style={{ padding: "5px", width: "150px" }}
            />
          </div>
          {/* 색인 종료 시간 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>색인 종료 시간</label>
            <input
              type="text"
              value={pyEnd}
              onChange={(e) => setPyEnd(e.target.value)}
              placeholder="예: 18:30"
              style={{ padding: "5px", width: "150px" }}
            />
          </div>
          {/* 목표 글쓰기 갯수 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>목표 글쓰기 갯수</label>
            <input
              type="number"
              value={postCount}
              readOnly // 사용자가 수정할 수 없도록 설정
              style={{
                padding: "5px",
                width: "150px",
                backgroundColor: "#ecf0f1",
                cursor: "not-allowed",
              }}
            />
          </div>
          {/* 추가 글쓰기 갯수 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>추가 글쓰기 갯수</label>
            <input
              type="number"
              value={addCount}
              onChange={(e) => setAddCount(e.target.value)}
              placeholder="예: 50"
              style={{ padding: "5px", width: "150px" }}
            />
          </div>
          {/* 전체 반복 횟수 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>전체 반복 횟수</label>
            <input
              type="number"
              value={cycleCount}
              onChange={(e) => setCycleCount(e.target.value)}
              placeholder="예: 5"
              style={{ padding: "5px", width: "150px" }}
            />
          </div>
        </div>
        <button
          onClick={handleSaveTimeSettings}
          style={{
            marginTop: "15px",
            padding: "10px 20px",
            backgroundColor: "#3498db",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          타임 세팅 저장
        </button>
      </div>

      {/* (5) 상태 메시지 출력 */}
      <div style={{ color: "#2c3e50", marginBottom: "10px" }}>{message}</div>

      {/* (6) 자동화 로그 뷰어 */}
      <h2 style={{ marginTop: "40px" }}>자동화 로그</h2>
      <div
        ref={logContainerRef}
        style={{
          marginTop: "10px",
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

      {/* (7) blink 애니메이션 정의 (전역) */}
      <style jsx global>{`
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
