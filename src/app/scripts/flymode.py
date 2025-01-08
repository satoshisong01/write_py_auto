# flymode.py

import subprocess
import time
import sys
import os

################################################################################
# 1) ADB 관련 설정 및 함수들
################################################################################

# ADB 실행 파일 경로 (실제 환경에 맞춰 수정하세요)
ADB_PATH = r"C:\adb\platform-tools\adb.exe"


def run_adb_command(command):
    """
    ADB 명령어를 실행하고 결과를 반환합니다.
    예: run_adb_command(["shell", "settings", "get", "global", "airplane_mode_on"])
    """
    try:
        result = subprocess.check_output([ADB_PATH] + command, stderr=subprocess.STDOUT)
        return result.decode('utf-8').strip()
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] 명령어 실행 오류: {' '.join(e.cmd)}")
        print(f"[ERROR] 출력: {e.output.decode('utf-8')}")
        return None
    except FileNotFoundError:
        print(f"[ERROR] ADB 실행 파일을 찾을 수 없습니다: {ADB_PATH}")
        return None


def is_device_connected():
    """
    ADB로 디바이스가 연결되어 있는지 확인합니다.
    'adb devices' 결과에 'device'가 표시되면 True, 아니면 False
    """
    result = run_adb_command(['devices'])
    if not result:
        return False

    lines = result.split('\n')
    # 첫 번째 라인은 "List of devices attached" 이므로 두 번째 줄부터 확인
    for line in lines[1:]:
        if 'device' in line and not line.startswith('*'):
            return True
    return False


def set_airplane_mode(state=True):
    """
    비행기 모드를 설정합니다.
    state=True이면 켜고, False이면 끕니다.
    1) airplane_mode_on 값 설정
    2) airplane_mode_radios 기본값으로 설정
    3) wifi, data, bluetooth 등 필요한 svc를 disable/enable
    """
    if not is_device_connected():
        print("[ERROR] 디바이스가 연결되어 있지 않습니다.")
        return

    # 비행기 모드 설정값 (1: 켬, 0: 끔)
    value = '1' if state else '0'
    run_adb_command(['shell', 'settings', 'put', 'global', 'airplane_mode_on', value])

    # 라디오 설정 (기본값: default)
    radios = "default"
    result = run_adb_command(['shell', 'settings', 'put', 'global', 'airplane_mode_radios', radios])
    if result is None:
        print("[WARN] airplane_mode_radios 설정을 적용하지 못했습니다.")

    # 브로드캐스트( am broadcast ... )는 최신 기기에서 권한 문제로 막힌 경우가 많아 주석 처리
    # svc 명령어로 wifi, data, bluetooth 등을 껐다 켜서 효과 비슷하게 적용
    run_adb_command(['shell', 'svc', 'wifi', 'disable' if state else 'enable'])
    run_adb_command(['shell', 'svc', 'data', 'disable' if state else 'enable'])
    run_adb_command(['shell', 'svc', 'bluetooth', 'disable' if state else 'enable'])

    print(f"[INFO] 비행기 모드를 {'켰습니다' if state else '꺼졌습니다'}.")


################################################################################
# 2) 메인 로직: 스크립트 실행 시 "비행기 모드 켰다 끄기" 한 번만 수행
################################################################################

def main():
    # 1) 디바이스 연결 여부 확인
    if not is_device_connected():
        print("[ERROR] 디바이스가 연결되어 있지 않습니다. 작업을 중단합니다.")
        sys.exit(1)

    # 2) 비행기 모드 켬
    set_airplane_mode(True)
    time.sleep(1)  # 1초 기다렸다가

    # 3) 비행기 모드 끔
    set_airplane_mode(False)
    print("[INFO] 비행기 모드를 한 번 토글했습니다.")


if __name__ == "__main__":
    main()
