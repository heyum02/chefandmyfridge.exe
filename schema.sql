-- 0. 데이터베이스 선택 (가장 먼저 와야 함!)
CREATE DATABASE IF NOT EXISTS smart_fridge;
USE smart_fridge;

-- 기존 테이블 삭제 (깔끔하게 초기화)
DROP TABLE IF EXISTS chat_history;
DROP TABLE IF EXISTS user_feedback;
DROP TABLE IF EXISTS fridge_items;
DROP TABLE IF EXISTS user_profile;
DROP TABLE IF EXISTS ingredients;

-- 1. 식재료 마스터 정보
CREATE TABLE ingredients (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    category VARCHAR(50)
);

-- 2. 사용자 프로필 (회원가입 정보 및 추천 근거 - 순서 위로 올림)
CREATE TABLE user_profile (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE,         -- 명세서 회원가입용 이메일
    password VARCHAR(255),             -- 명세서 회원가입용 비밀번호
    nickname VARCHAR(50),              -- 명세서 회원가입용 닉네임
    kitchen_tools TEXT,
    allergies TEXT,
    preferred_ingredients TEXT,
    disliked_ingredients TEXT
);

-- 3. 사용자 냉장고 재고 (API 명세서 완벽 반영)
CREATE TABLE fridge_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT 1,
    ingredient_id INT,
    quantity INT DEFAULT 1,      -- 명세서의 amount
    unit VARCHAR(10),            -- 명세서의 unit
    expiry_date DATE,            -- 명세서의 expiryDate
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
    FOREIGN KEY (user_id) REFERENCES user_profile(user_id)
);

-- 4. 사용자 피드백 (API 명세서 '요리 완료 기록' 대응)
CREATE TABLE user_feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    recipe_name VARCHAR(100),    -- 레시피 이름
    rating INT,                  -- 별점
    comment TEXT,                -- 코멘트
    taste_feedback TEXT,         -- 명세서의 tasteFeedback (6단계 입맛 피드백)
    is_bookmark TINYINT(1) DEFAULT 0, -- ⭐ [영균님 요청] 즐겨찾기 여부 (0=안함, 1=즐겨찾기)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profile(user_id)
);

-- 5. 챗봇 대화 내역 (대화 기억용 테이블)
CREATE TABLE chat_history (
    chat_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    sender ENUM('user', 'ai'),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profile(user_id)
);