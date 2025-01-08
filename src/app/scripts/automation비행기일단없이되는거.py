import logging
import sys
import json
import os
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

# 로깅 설정
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

# 전역 변수로 브라우저 드라이버 선언
set_data = []  # 세트별로 저장된 ID, 비밀번호, URL 리스트

# 각 세트의 ID와 비밀번호로 브라우저 로그인
def login_with_set(driver, set_info, set_num):
    user_id = set_info.get("naver_id")
    user_pw = set_info.get("naver_password")

    if not user_id or not user_pw:
        logging.error(f"세트 {set_num + 1}: ID 또는 비밀번호가 비어 있습니다.")
        return False

    driver.get('https://nid.naver.com/nidlogin.login')  # 네이버 로그인 페이지로 이동
    logging.info(f"세트 {set_num + 1}: 로그인 페이지로 이동")

    time.sleep(2)  # 페이지 로딩 대기

    try:
        # ID 입력 필드 찾아서 pyperclip을 사용하여 붙여넣기
        pyperclip.copy(user_id)
        id_field = driver.find_element(By.ID, 'id')
        id_field.click()
        id_field.send_keys(Keys.CONTROL, 'v')  # 클립보드 내용 붙여넣기
        logging.info(f"세트 {set_num + 1}: ID 입력 완료")

        # 비밀번호 입력 필드 찾아서 pyperclip을 사용하여 붙여넣기
        pyperclip.copy(user_pw)
        pw_field = driver.find_element(By.ID, 'pw')
        pw_field.click()
        pw_field.send_keys(Keys.CONTROL, 'v')  # 클립보드 내용 붙여넣기
        logging.info(f"세트 {set_num + 1}: 비밀번호 입력 완료")

        time.sleep(1)  # 입력 대기

        # 로그인 버튼 클릭
        login_button = driver.find_element(By.ID, 'log.login')
        login_button.click()
        logging.info(f"세트 {set_num + 1}: 로그인 버튼 클릭")

        time.sleep(3)  # 로그인 처리 대기

        # 로그인 성공 여부 확인 (예: 특정 요소가 있는지 확인)
        if "로그인" in driver.title:
            logging.error(f"세트 {set_num + 1}: 로그인 실패")
            return False

        logging.info(f"세트 {set_num + 1}: 로그인 성공")
        return True

    except NoSuchElementException as e:
        logging.error(f"세트 {set_num + 1}: 로그인 과정 중 요소를 찾지 못했습니다: {e}")
        return False

# URL에서 도메인 부분 추출 (https://example.com 형식)
def extract_domain(url):
    match = re.match(r'(https://[^/]+)', url)
    return match.group(1) if match else None

# 'td.text-start' 안에 있는 a 태그 텍스트와 URL의 도메인 비교 후 클릭
def find_and_click_a_tag(driver, input_domain, set_num):
    try:
        WebDriverWait(driver, 10).until(EC.presence_of_all_elements_located((By.XPATH, '//td[@class="text-start"]//a')))
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
                        logging.info("세트 {set_num + 1}: a 태그 클릭 완료")
                        time.sleep(2)  
                        return True
        return False

    except NoSuchElementException as e:
        logging.error(f"세트 {set_num + 1}: 테이블 내 'td.text-start' 안의 a 태그를 찾는 데 실패했습니다: {e}")
        return False

# 왼쪽 메뉴에서 '요청' 클릭 후 '웹 페이지 수집' 소메뉴 클릭
def click_request_and_web_page_collect(driver, set_num):
    try:
        request_menu = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, '//div[contains(text(), "요청")]')))
        logging.info(f"세트 {set_num + 1}: 왼쪽 메뉴에서 '요청' 클릭")
        request_menu.click()
        time.sleep(1.5)

        web_collect_menu = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, '//div[contains(text(), "웹 페이지 수집")]')))
        
        if web_collect_menu:
            logging.info(f"세트 {set_num + 1}: '웹 페이지 수집' 메뉴 클릭: {web_collect_menu.text}")
            web_collect_menu.click()
            time.sleep(1.5)  
        else:
            logging.warning(f"세트 {set_num + 1}: '웹 페이지 수집' 메뉴를 찾을 수 없습니다.")

    except NoSuchElementException as e:
        logging.error(f"세트 {set_num + 1}: '요청' 또는 '웹 페이지 수집' 메뉴를 클릭하는 데 실패했습니다: {e}")

# 알림창이 나타날 때 처리하는 함수
def handle_alert(driver, set_num):
    try:
        # 알림창이 뜰 때까지 대기 (최대 5초)
        WebDriverWait(driver, 5).until(EC.alert_is_present())
        alert = driver.switch_to.alert
        alert_text = alert.text
        logging.info(f"세트 {set_num + 1}: 알림창 메시지: {alert_text}")
        
        # 특정 알림 메시지 처리
        if "사이트별 일간 최대 요청 수를 초과하였습니다." in alert_text:
            logging.info(f"세트 {set_num + 1}: 일간 요청 수 초과 알림을 처리 중...")
            alert.accept()  # 알림창 닫기
            logging.info(f"세트 {set_num + 1}: 알림창을 닫았습니다.")
            return True  # 알림창이 있었음을 반환하고 계속 작업 진행
        
        # 다른 알림 메시지일 경우에도 닫음
        alert.accept()
        logging.info(f"세트 {set_num + 1}: 알림창을 닫았습니다.")
        return True  # 알림창이 있었음을 반환

    except NoSuchElementException:
        # 알림창이 존재하지 않으면 조용히 넘어감
        return False
    except Exception as e:
        # 예외 발생 시 메시지가 있는지 확인하여 처리
        if str(e).strip():  # 예외 메시지가 있을 때만 로그에 기록
            logging.error(f"세트 {set_num + 1}: 알림창 처리 중 오류: {e}")
        return False

# 매크로를 실행하는 함수 (네이버 로그인 후 URL 처리)
def start_automation(driver, urls, set_num):
    # urls가 리스트가 아닐 경우 리스트로 변환
    if isinstance(urls, str):
        urls = [urls]  # 단일 URL 문자열을 리스트로 변환
    elif not isinstance(urls, list):
        logging.error(f"세트 {set_num + 1}: URL 리스트가 유효하지 않습니다.")
        return

    for index, url in enumerate(urls, start=1):
        try:
            input_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, '//div[contains(@class, "v-text-field__slot")]/input'))
            )

            input_field.send_keys(Keys.CONTROL + 'a')  # 전체 선택
            input_field.send_keys(url)
            logging.info(f"세트 {set_num + 1}: {index}번째 URL 입력: {url}")

            time.sleep(2)

            confirm_button = driver.find_element(By.XPATH, '//div[@class="pl-6 col col-auto"]/button[contains(@class, "v-btn") and .//span[contains(text(), "확인")]]')
            confirm_button.click()
            logging.info(f"세트 {set_num + 1}: 확인 버튼 클릭")

            time.sleep(2)

            # 알림창 처리 (알림이 있을 경우)
            if handle_alert(driver, set_num):
                logging.info(f"세트 {set_num + 1}: 알림창 처리 후, 다음 URL로 계속 진행")

            time.sleep(6)

        except Exception as e:
            logging.error(f"세트 {set_num + 1}: URL 처리 중 오류 발생: {e}")
    
    time.sleep(2)
    driver.get('https://searchadvisor.naver.com/console/board')
    logging.info(f"세트 {set_num + 1}: 모든 URL 처리 후 원래 페이지로 복귀")

# 세트별로 브라우저를 열고, 각 세트가 끝나면 브라우저를 닫고, 다음 세트를 처리
def process_all_sets():
    global set_data

    total_sets = len(set_data)
    logging.info(f"총 {total_sets}개의 세트를 처리합니다.")

    for set_num, set_info in enumerate(set_data):
        logging.info(f"세트 {set_num + 1} 처리 시작")

        # 새로운 브라우저 열기
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
        driver.set_window_size(1150, 800)

        if not login_with_set(driver, set_info, set_num):
            driver.quit()  # 문제가 있을 경우 브라우저 닫기
            continue

        # 로그인 후 특정 URL로 이동
        driver.get('https://searchadvisor.naver.com/console/board')
        logging.info(f"세트 {set_num + 1}: 로그인 후 페이지로 이동 완료")

        time.sleep(5)  # 페이지 로딩 대기

        # 각 세트의 URL 입력 필드를 처리
        urls = set_info.get("links", [])
        total_urls = len(urls)
        logging.info(f"세트 {set_num + 1}: 총 {total_urls}개의 URL을 처리합니다.")

        if total_urls == 0:
            logging.warning(f"세트 {set_num + 1}: 처리할 URL이 없습니다.")
            driver.quit()
            logging.info(f"세트 {set_num + 1}: 브라우저 닫기")
            continue

        # 50개씩 나누기
        batch_size = 50
        num_batches = math.ceil(total_urls / batch_size)

        for batch_num in range(num_batches):
            batch_urls = urls[batch_num * batch_size : (batch_num + 1) * batch_size]
            logging.info(f"세트 {set_num + 1}: 배치 {batch_num + 1}/{num_batches} 처리 시작")

            # 각 배치별로 도메인 추출 및 a 태그 클릭
            if batch_urls:
                input_domain = extract_domain(batch_urls[0])
                if input_domain:
                    if find_and_click_a_tag(driver, input_domain, set_num):
                        click_request_and_web_page_collect(driver, set_num)
                        start_automation(driver, batch_urls, set_num)
                    else:
                        logging.warning(f"세트 {set_num + 1}: 해당 도메인과 일치하는 a 태그를 찾을 수 없습니다: {input_domain}")
                else:
                    logging.warning(f"세트 {set_num + 1}: URL에서 도메인을 추출할 수 없습니다: {batch_urls[0]}")
            else:
                logging.warning(f"세트 {set_num + 1}: 배치 {batch_num + 1}에 URL이 없습니다.")

            logging.info(f"세트 {set_num + 1}: 배치 {batch_num + 1} 처리 완료")

        logging.info(f"세트 {set_num + 1}: 모든 배치 처리 완료")

        driver.quit()  # 세트 완료 후 브라우저 닫기
        logging.info(f"세트 {set_num + 1}: 작업 완료 후 브라우저 닫기")

    logging.info("모든 세트의 작업이 완료되었습니다.")

# 워크리스트 파일 읽기 함수
def read_worklist_file(file_path):
    if not os.path.exists(file_path):
        logging.error(f"워크리스트 파일을 찾을 수 없습니다: {file_path}")
        return []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            # 여기서 바로 list를 얻는다
            worklist_json = json.load(file)
        
        # 만약 worklist_json이 list가 맞는지 확인 (아닐 경우 대비)
        if not isinstance(worklist_json, list):
            logging.error("워크리스트 JSON이 배열(list) 형태가 아닙니다.")
            return []
        
        # 리스트를 그대로 반환
        logging.info(f"워크리스트 파일에서 총 {len(worklist_json)}개의 계정을 읽어왔습니다.")
        return worklist_json

    except json.JSONDecodeError as e:
        logging.error(f"워크리스트 파일을 JSON으로 파싱하는 데 실패했습니다: {e}")
        return []
    except Exception as e:
        logging.error(f"워크리스트 파일 읽기 중 오류 발생: {e}")
        return []


# URL 파일 읽기 함수
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

# 데이터 구조화 및 자동화 작업 준비
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

    # URL을 username별로 할당
    for username, url in url_entries:
        if username in user_dict:
            user_dict[username]["links"].append(url)
        else:
            logging.warning(f"URL 파일에 존재하지만 워크리스트 데이터에 없는 username: {username}")

    # set_data 구성
    set_data = [info for info in user_dict.values() if info["links"]]
    logging.info(f"총 {len(set_data)}개의 세트가 준비되었습니다.")
    return set_data

###########################
# 메인 함수 시작
###########################

def main():
    global set_data

    # 워크리스트 파일 경로는 명령줄 인자로 전달됨
    if len(sys.argv) < 2:
        logging.info("워크리스트 파일 경로가 전달되지 않았습니다. 기본값으로 'worklist.json'을 사용합니다.")
        worklist_file = "worklist.json"
    else:
        worklist_file = sys.argv[1]

    # 워크리스트 파일 존재 여부 확인
    if not os.path.exists(worklist_file):
        logging.error(f"워크리스트 파일이 존재하지 않습니다: {worklist_file}")
        sys.exit(1)

    # 워크리스트 파일 읽기
    worklist = read_worklist_file(file_path=worklist_file)
    if not worklist:
        logging.error("워크리스트 데이터가 비어있습니다. 스크립트를 종료합니다.")
        sys.exit(1)

    # URL 파일 경로 (스크립트와 같은 폴더에 있는 것으로 가정)
    url_file_path = "copied_urls2.txt"

    # URL 파일 읽기
    url_entries = read_url_file(file_path=url_file_path)

    if not url_entries:
        logging.error("URL 데이터가 비어있습니다. 스크립트를 종료합니다.")
        sys.exit(1)

    # 데이터 구조화 및 자동화 작업 준비
    set_data = prepare_set_data(worklist, url_entries)

    if not set_data:
        logging.error("처리할 세트가 없습니다. 스크립트를 종료합니다.")
        sys.exit(1)

    # 자동화 작업 시작
    process_all_sets()

if __name__ == "__main__":
    main()
