# automation.py

import logging
import sys
import json
import os
import subprocess
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pyperclip
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, UnexpectedAlertPresentException
import time
import re
import math
import requests
from datetime import datetime

################################################################################
# 로깅 설정
################################################################################

logging.basicConfig(
    filename="automation.log",  # 로그 파일 이름
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
console.setFormatter(formatter)
logging.getLogger('').addHandler(console)

################################################################################
# 전역 변수
################################################################################

set_data = []  # 세트별로 저장된 ID, 비밀번호, URL 리스트

################################################################################
# 로그인 함수
################################################################################

def login_with_set(driver, set_info, set_num):
    user_id = set_info.get("naver_id")
    user_pw = set_info.get("naver_password")

    if not user_id or not user_pw:
        logging.error(f"세트 {set_num + 1}: ID 또는 비밀번호가 비어 있습니다.")
        return False

    driver.get('https://nid.naver.com/nidlogin.login')  # 네이버 로그인 페이지
    logging.info(f"세트 {set_num + 1}: 로그인 페이지로 이동")

    time.sleep(2)  # 페이지 로딩 대기

    try:
        # ID 입력
        pyperclip.copy(user_id)
        id_field = driver.find_element(By.ID, 'id')
        id_field.click()
        id_field.send_keys(Keys.CONTROL, 'v')
        logging.info(f"세트 {set_num + 1}: ID 입력 완료")

        # 비밀번호 입력
        pyperclip.copy(user_pw)
        pw_field = driver.find_element(By.ID, 'pw')
        pw_field.click()
        pw_field.send_keys(Keys.CONTROL, 'v')
        logging.info(f"세트 {set_num + 1}: 비밀번호 입력 완료")

        time.sleep(1)

        # 로그인 버튼
        login_button = driver.find_element(By.ID, 'log.login')
        login_button.click()
        logging.info(f"세트 {set_num + 1}: 로그인 버튼 클릭")

        time.sleep(3)

        # 로그인 성공 여부
        if "로그인" in driver.title:
            logging.error(f"세트 {set_num + 1}: 로그인 실패 (타이틀에 '로그인' 포함)")
            return False

        logging.info(f"세트 {set_num + 1}: 로그인 성공")
        return True

    except NoSuchElementException as e:
        logging.error(f"세트 {set_num + 1}: 로그인 과정 중 요소를 찾지 못했습니다: {e}")
        return False

################################################################################
# 알림창 처리
################################################################################

def handle_alert(driver, set_num):
    """
    알림창이 나타나면 닫고, 메시지에 따라 'exceed' 신호를 반환할 수도 있음.
      - 'exceed' : 사이트별 일간 최대 요청 수를 초과
      - 'handled': 알림창을 잘 처리함
      - 'none'   : 알림창 없음
    """
    try:
        WebDriverWait(driver, 5).until(EC.alert_is_present())
        alert = driver.switch_to.alert
        alert_text = alert.text
        logging.info(f"세트 {set_num + 1}: 알림창 메시지: {alert_text}")

        # 사이트별 일간 최대 요청 수 초과
        if "사이트별 일간 최대 요청 수를 초과하였습니다." in alert_text:
            logging.info(f"세트 {set_num + 1}: 일간 요청 수 초과 알림 발생 → 알림창 닫기")
            alert.accept()
            logging.info(f"세트 {set_num + 1}: 알림창 닫음 -> 'exceed' 반환")
            return "exceed"

        # 그 외 알림창도 닫기
        alert.accept()
        logging.info(f"세트 {set_num + 1}: 알림창 닫음 -> 'handled' 반환")
        return "handled"

    except NoSuchElementException:
        return "none"
    except Exception as e:
        if str(e).strip():
            logging.error(f"세트 {set_num + 1}: 알림창 처리 중 오류: {e}")
        return "none"

################################################################################
# 도메인 추출 및 a 태그 클릭
################################################################################

def extract_domain(url):
    match = re.match(r'(https://[^/]+)', url)
    return match.group(1) if match else None

def find_and_click_a_tag(driver, input_domain, set_num):
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.XPATH, '//td[@class="text-start"]//a'))
        )
        a_tags = driver.find_elements(By.XPATH, '//td[@class="text-start"]//a')
        
        if input_domain:
            logging.info(f"세트 {set_num + 1}: 입력된 도메인: {input_domain}")

            for a_tag in a_tags:
                a_text = a_tag.text.strip()
                if a_text:
                    logging.info(f"세트 {set_num + 1}: 비교 중인 a 태그 텍스트: {a_text}")
                    if input_domain in a_text:
                        logging.info(f"세트 {set_num + 1}: 일치하는 a 태그 클릭: {a_text}")
                        a_tag.click()
                        time.sleep(2)
                        return True
        return False

    except NoSuchElementException as e:
        logging.error(f"세트 {set_num + 1}: 'td.text-start' 안의 a 태그를 찾지 못했습니다: {e}")
        return False

################################################################################
# 왼쪽 메뉴에서 '요청' 클릭 후 '웹 페이지 수집' 소메뉴 클릭
################################################################################

def click_request_and_web_page_collect(driver, set_num):
    try:
        request_menu = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//div[contains(text(), "요청")]'))
        )
        logging.info(f"세트 {set_num + 1}: 왼쪽 메뉴에서 '요청' 클릭")
        request_menu.click()
        time.sleep(1.5)

        web_collect_menu = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//div[contains(text(), "웹 페이지 수집")]'))
        )
        
        if web_collect_menu:
            logging.info(f"세트 {set_num + 1}: '웹 페이지 수집' 메뉴 클릭: {web_collect_menu.text}")
            web_collect_menu.click()
            time.sleep(1.5)
        else:
            logging.warning(f"세트 {set_num + 1}: '웹 페이지 수집' 메뉴를 찾을 수 없습니다.")

    except NoSuchElementException as e:
        logging.error(f"세트 {set_num + 1}: '요청' 또는 '웹 페이지 수집' 클릭 실패: {e}")

################################################################################
# 매크로 실행 함수 (URL 입력)
################################################################################

def start_automation(driver, urls, set_num):
    if isinstance(urls, str):
        urls = [urls]
    elif not isinstance(urls, list):
        logging.error(f"세트 {set_num + 1}: URL 리스트가 유효하지 않습니다.")
        return "ok"

    for index, url in enumerate(urls, start=1):
        try:
            input_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, '//div[contains(@class, "v-text-field__slot")]/input'))
            )

            # URL 입력
            input_field.send_keys(Keys.CONTROL + 'a')
            input_field.send_keys(url)
            logging.info(f"세트 {set_num + 1}: {index}번째 URL 입력: {url}")

            time.sleep(2)

            # 확인 버튼 클릭
            confirm_button = driver.find_element(
                By.XPATH,
                '//div[@class="pl-6 col col-auto"]/button[contains(@class, "v-btn") and .//span[contains(text(), "확인")]]'
            )
            confirm_button.click()
            logging.info(f"세트 {set_num + 1}: 확인 버튼 클릭")

            time.sleep(2)

            # 알림창 처리
            alert_result = handle_alert(driver, set_num)
            if alert_result == "exceed":
                # "일간 요청 초과"라면 즉시 반환
                logging.info(f"세트 {set_num + 1}: 일간 요청 초과 -> start_automation에서 'exceed' 리턴")
                return "exceed"
            elif alert_result in ("handled", "none"):
                # 알림창이 없거나, 그냥 닫고 넘어갈 수 있는 경우
                # => 여기서 '정상 처리'로 보고 DB 업데이트
                py_date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                payload = {
                    "link": url,
                    "py_date": py_date_str,
                    "py_mark": "O"
                }
                try:
                    api_url = "http://localhost:3000/api/posts/updatePyMark"
                    r = requests.post(api_url, json=payload, timeout=10)
                    if r.status_code == 200 and r.json().get("success"):
                        logging.info(f"세트 {set_num + 1}: DB py_mark update success (url={url})")
                    else:
                        logging.error(
                            f"세트 {set_num + 1}: DB py_mark update 실패 - response={r.text}"
                        )
                except Exception as e:
                    logging.error(f"세트 {set_num + 1}: DB py_mark update 중 예외 발생: {e}")

            # 알림창이 아니라면 계속 진행
            time.sleep(6)

        except Exception as e:
            logging.error(f"세트 {set_num + 1}: URL 처리 중 오류 발생: {e}")
    
    # 모든 URL 처리 후
    time.sleep(2)
    driver.get('https://searchadvisor.naver.com/console/board')
    logging.info(f"세트 {set_num + 1}: 모든 URL 처리 후 원래 페이지로 복귀")
    return "ok"

################################################################################
# 세트별로 브라우저를 열고 작업 -> 다음 세트
################################################################################

def process_all_sets():
    global set_data

    total_sets = len(set_data)
    logging.info(f"총 {total_sets}개의 세트를 처리합니다.")

    for set_num, set_info in enumerate(set_data):
        logging.info(f"세트 {set_num + 1} 처리 시작")

        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
        driver.set_window_size(1150, 800)

        # 로그인
        if not login_with_set(driver, set_info, set_num):
            driver.quit()
            continue

        # 특정 페이지 이동
        driver.get('https://searchadvisor.naver.com/console/board')
        logging.info(f"세트 {set_num + 1}: 로그인 후 페이지로 이동 완료")

        time.sleep(5)

        urls = set_info.get("links", [])
        total_urls = len(urls)
        logging.info(f"세트 {set_num + 1}: 총 {total_urls}개의 URL을 처리합니다.")

        if total_urls == 0:
            logging.warning(f"세트 {set_num + 1}: 처리할 URL이 없습니다.")
            driver.quit()
            continue

        batch_size = 50
        num_batches = math.ceil(total_urls / batch_size)
        exceed_flag = False  # 'exceed' 감지 시 True

        for batch_num in range(num_batches):
            if exceed_flag:
                break  # 이미 초과 발생했으면 더 처리 안 함

            batch_urls = urls[batch_num * batch_size : (batch_num + 1) * batch_size]
            logging.info(f"세트 {set_num + 1}: 배치 {batch_num + 1}/{num_batches} 처리 시작")

            if batch_urls:
                input_domain = extract_domain(batch_urls[0])
                if input_domain:
                    clicked = find_and_click_a_tag(driver, input_domain, set_num)
                    if clicked:
                        click_request_and_web_page_collect(driver, set_num)
                        result = start_automation(driver, batch_urls, set_num)
                        if result == "exceed":
                            exceed_flag = True
                            logging.info(f"세트 {set_num + 1}: 일간 요청 초과 -> 배치 중단")
                            break
                    else:
                        logging.warning(f"세트 {set_num + 1}: '{input_domain}' 일치 a 태그 찾지 못함")
                else:
                    logging.warning(f"세트 {set_num + 1}: URL에서 도메인을 추출할 수 없습니다: {batch_urls[0]}")
            else:
                logging.warning(f"세트 {set_num + 1}: 배치 {batch_num + 1}에 URL이 없습니다.")

            logging.info(f"세트 {set_num + 1}: 배치 {batch_num + 1} 처리 완료")

        driver.quit()
        logging.info(f"세트 {set_num + 1}: 작업 완료 후 브라우저 닫기")

        # flymode.py 관련 로직 제거 (아래 부분 삭제)

    logging.info("모든 세트의 작업이 완료되었습니다.")

################################################################################
# 파일 읽기
################################################################################

def read_worklist_file(file_path):
    if not os.path.exists(file_path):
        logging.error(f"워크리스트 파일을 찾을 수 없습니다: {file_path}")
        return []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            worklist_json = json.load(file)
        
        if not isinstance(worklist_json, list):
            logging.error("워크리스트 JSON이 배열(list) 형태가 아닙니다.")
            return []
        
        logging.info(f"워크리스트 파일에서 총 {len(worklist_json)}개의 계정을 읽어왔습니다.")
        return worklist_json

    except Exception as e:
        logging.error(f"워크리스트 파일 읽기 중 오류 발생: {e}")
        return []

def read_url_file(file_path):
    if not os.path.exists(file_path):
        logging.error(f"URL 파일을 찾을 수 없습니다: {file_path}")
        return []
    
    with open(file_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    url_data = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if ':' not in line:
            logging.warning(f"잘못된 형식의 라인 무시: {line}")
            continue
        username, url = line.split(':', 1)
        username = username.strip()
        url = url.strip()
        if username and url:
            url_data.append((username, url))
        else:
            logging.warning(f"빈 username 또는 URL이 있는 라인 무시: {line}")
    
    logging.info(f"URL 파일에서 총 {len(url_data)}개의 (username, URL) 쌍을 읽어왔습니다.")
    return url_data

def prepare_set_data(worklist, url_entries):
    user_dict = {}
    for record in worklist:
        username = record.get("username")
        if not username:
            continue
        if username not in user_dict:
            user_dict[username] = {
                "username": username,
                "naver_id": record.get("naver_id"),
                "naver_password": record.get("naver_password"),
                "links": []
            }

    for username, url in url_entries:
        if username in user_dict:
            user_dict[username]["links"].append(url)
        else:
            logging.warning(f"URL 파일에 존재하지만 워크리스트에 없는 username: {username}")

    result = [info for info in user_dict.values() if info["links"]]
    logging.info(f"총 {len(result)}개의 세트가 준비되었습니다.")
    return result

################################################################################
# 메인
################################################################################

def main():
    global set_data

    # 워크리스트 파일 경로
    if len(sys.argv) < 2:
        logging.info("워크리스트 파일 경로가 전달되지 않았습니다. 기본값 'worklist.json' 사용")
        worklist_file = "worklist.json"
    else:
        worklist_file = sys.argv[1]

    if not os.path.exists(worklist_file):
        logging.error(f"워크리스트 파일이 존재하지 않습니다: {worklist_file}")
        sys.exit(1)

    worklist = read_worklist_file(worklist_file)
    if not worklist:
        logging.error("워크리스트 데이터가 비어있습니다. 종료.")
        sys.exit(1)

    url_file_path = "copied_urls2.txt"
    url_entries = read_url_file(url_file_path)
    if not url_entries:
        logging.error("URL 데이터가 비어있습니다. 종료.")
        sys.exit(1)

    set_data = prepare_set_data(worklist, url_entries)
    if not set_data:
        logging.error("처리할 세트가 없습니다. 종료.")
        sys.exit(1)

    process_all_sets()

if __name__ == "__main__":
    main()
