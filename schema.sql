-- 0. 데이터베이스 선택
CREATE DATABASE IF NOT EXISTS smart_fridge;
USE smart_fridge;

-- 기존 테이블 삭제 (초기화)
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

-- 2. 사용자 프로필 (비즈니스 필드 추가 완료)
CREATE TABLE user_profile (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE,         
    password VARCHAR(255),             
    nickname VARCHAR(50),              
    is_premium TINYINT(1) DEFAULT 0,    -- ⭐️ 프리미엄 구독 여부 (0: 일반, 1: 프리미엄)
    free_count INT DEFAULT 5,           -- ⭐️ 무료 생성 잔여 횟수
    kitchen_tools TEXT,
    allergies TEXT,
    preferred_ingredients TEXT,
    disliked_ingredients TEXT
);

-- 3. 사용자 냉장고 재고
CREATE TABLE fridge_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT 1,
    ingredient_id INT,
    quantity INT DEFAULT 1,      
    unit VARCHAR(10),            
    expiry_date DATE,            
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
    FOREIGN KEY (user_id) REFERENCES user_profile(user_id)
);

-- 4. 사용자 피드백 
CREATE TABLE user_feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    recipe_name VARCHAR(100),    
    rating INT,                  
    comment TEXT,                
    taste_feedback TEXT,         
    is_bookmark TINYINT(1) DEFAULT 0, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profile(user_id)
);

-- 5. 챗봇 대화 내역
CREATE TABLE chat_history (
    chat_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    sender ENUM('user', 'ai'),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profile(user_id)
);