import pandas as pd
import re
from sqlalchemy import create_engine

# ==========================================
# 1. 전처리 및 익명화 함수 정의
# ==========================================

def anonymize_text(text):
    """
    개인 식별 정보(이름, 학교명 등)를 제거하는 더미 익명화 로직
    """
    if pd.isna(text) or text == '알 수 없음':
        return text
    
    text = str(text)
    
    # 1. 이름 익명화 (예: 홍길동 -> 홍O동, 김철수 -> 김O수)
    # 한글 3글자 이름 패턴을 단순 매칭하여 중간 글자 마스킹
    text = re.sub(r'([가-힣])([가-힣])([가-힣])', r'\1O\3', text)
    
    # 2. 학교명 익명화 (예: 서울한국초등학교 -> OO초등학교)
    text = re.sub(r'([가-힣]+)(초등학교|중학교|고등학교)', r'OO\2', text)
    
    # 3. 연락처 익명화 (예: 010-1234-5678 -> 010-XXXX-XXXX)
    text = re.sub(r'\d{2,3}-\d{3,4}-\d{4}', r'OOO-XXXX-XXXX', text)
    
    return text

def preprocess_data(df):
    """
    결측치 처리, 데이터 타입 변환 및 비정형 텍스트 구조화를 수행하는 메인 전처리 함수
    """
    print("[-] 결측치 및 오탈자 정제 중...")
    # 결측치 처리 (빈 문자열이나 NaN을 '알 수 없음'으로 대체)
    df = df.fillna('알 수 없음')
    
    # 데이터 타입 변환 (날짜 변환 등)
    if '발생일자' in df.columns:
        # errors='coerce'를 통해 변환 불가능한 값은 NaT로 처리 후 다시 문자열 정제 가능
        df['발생일자'] = pd.to_datetime(df['발생일자'], errors='coerce')
        df['발생일자'] = df['발생일자'].dt.strftime('%Y-%m-%d')
        df['발생일자'] = df['발생일자'].fillna('1970-01-01') # 기본값 처리
        
    print("[-] 개인정보 익명화 처리 중...")
    # 익명화 대상 컬럼 지정
    columns_to_anonymize = ['관련자명', '학교명', '사건개요', '상세내용']
    for col in columns_to_anonymize:
        if col in df.columns:
            df[col] = df[col].apply(anonymize_text)
            
    print("[-] 비정형 텍스트(사건개요) 구조화 및 키워드 추출 중...")
    # [비정형 텍스트 구조화 아이디어]
    # AI/RAG 활용을 높이기 위해 사건개요 텍스트 내부에서 주요 키워드를 추출하여 별도의 메타데이터 컬럼으로 분리합니다.
    if '사건개요' in df.columns:
        def extract_keywords(text):
            keywords = []
            if '욕설' in text or '폭언' in text or '모욕' in text: keywords.append('폭언/모욕')
            if '때림' in text or '폭행' in text or '신체적' in text: keywords.append('폭행/상해')
            if '협박' in text or '위협' in text: keywords.append('협박')
            if '성희롱' in text or '수치심' in text: keywords.append('성희롱')
            if '수업방해' in text or '소란' in text: keywords.append('수업방해')
            return ','.join(keywords) if keywords else '기타'
            
        df['추출된_침해유형'] = df['사건개요'].apply(extract_keywords)

    return df

# ==========================================
# 2. 데이터베이스 적재 함수
# ==========================================

def load_to_db(df, table_name, db_url):
    """
    정제된 데이터를 PostgreSQL 데이터베이스에 초기 적재합니다.
    """
    print(f"[-] 데이터베이스({table_name}) 적재 시작...")
    try:
        # SQLAlchemy 엔진 생성
        engine = create_engine(db_url)
        
        # DataFrame을 SQL 테이블에 삽입 (존재 시 append)
        # index=False 설정으로 DataFrame 인덱스는 제외
        df.to_sql(table_name, engine, if_exists='append', index=False)
        print(f"[+] 성공: {len(df)}개의 데이터가 '{table_name}' 테이블에 적재되었습니다.")
        
    except Exception as e:
        print(f"[!] 데이터베이스 적재 중 오류 발생: {e}")

# ==========================================
# 3. 메인 파이프라인 실행
# ==========================================

if __name__ == "__main__":
    # 1. 공공 데이터 수집 (CSV/Excel 파일 읽기 가정)
    print("[1] 공공 데이터 로딩 중...")
    
    # 실제 파일 경로 (예: 공공데이터포털 교권침해 csv 파일)
    # file_path = 'data/public_teacher_rights_violations.csv'
    # df = pd.read_csv(file_path, encoding='utf-8')
    
    # [테스트용] 더미 데이터프레임 생성
    dummy_data = {
        '사건ID': ['INC-001', 'INC-002', 'INC-003'],
        '발생일자': ['2023-04-15', '2023-05-20', None],
        '학교명': ['서울한국초등학교', '부산제일중학교', '대전행복고등학교'],
        '관련자명': ['홍길동', '김철수', '이영희'],
        '사건개요': ['학부모가 교무실로 찾아와 욕설과 폭언을 하며 위협함.', '학생이 수업 중 교사를 때림 및 소란 피움.', '온라인 맘카페에 교사에 대한 허위사실과 성희롱 발언 게시'],
        '조치결과': ['특별교육 10시간', '출석정지 5일', '형사고발 (진행중)']
    }
    df = pd.DataFrame(dummy_data)
    
    print(f"[+] 데이터 로딩 완료. 총 {len(df)}건")

    # 2. 데이터 전처리 (정제, 익명화, 구조화)
    print("\n[2] 데이터 전처리 시작...")
    processed_df = preprocess_data(df)
    print("[+] 데이터 전처리 완료.")
    print("--- 전처리 결과 샘플 ---")
    print(processed_df[['학교명', '관련자명', '사건개요', '추출된_침해유형']].head())
    print("------------------------")

    # 3. 데이터베이스(PostgreSQL) 적재
    print("\n[3] 데이터베이스 적재 준비...")
    # 설정에 맞는 실제 PostgreSQL 환경변수 또는 URL 기입 필요
    # 기존 schema.sql에 있는 public_guidelines 또는 새로운 통계 테이블 활용 가능
    DB_URL = 'postgresql://postgres:postgres@localhost:5432/teachguard_db'
    TARGET_TABLE = 'public_incident_cases' 
    
    # 아래 주석을 해제하면 실제 DB로 전송됩니다.
    # load_to_db(processed_df, TARGET_TABLE, DB_URL)
    print("[+] (시뮬레이션) 모든 데이터 파이프라인 작업이 완료되었습니다.")
