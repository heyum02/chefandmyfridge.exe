CREATE DATABASE IF NOT EXISTS smart_fridge;
USE smart_fridge;

-- 1. 재료 사전 테이블
CREATE TABLE IF NOT EXISTS ingredients (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    category VARCHAR(50)
);

-- 2. 냉장고 재고 테이블
CREATE TABLE IF NOT EXISTS fridge_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT,
    quantity INT DEFAULT 1,
    unit VARCHAR(10),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
);

-- 3. 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS user_profile (
    user_id INT PRIMARY KEY DEFAULT 1,
    kitchen_tools TEXT,
    allergies TEXT,
    preferred_ingredients TEXT,
    disliked_ingredients TEXT
);

-- 4. 챗봇 대화 내역 테이블
CREATE TABLE IF NOT EXISTS chat_history (
    chat_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    sender ENUM('user', 'ai'),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profile(user_id)
);