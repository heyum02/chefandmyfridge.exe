const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors'); // 프론트엔드 연동을 위한 설정

dotenv.config();
const app = express();

// 프론트엔드에서 오는 데이터와 요청을 허용하는 필수 설정
app.use(cors()); 
app.use(express.json()); 

// 데이터베이스 연결 설정 (기존 내용 유지)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// [API 1] 냉장고 전체 재고 조회 (프론트엔드 조회용)
app.get('/fridge', async (req, res) => {
    try {
        const query = `
            SELECT f.item_id, i.name, i.category, f.quantity 
            FROM fridge_items f 
            JOIN ingredients i ON f.ingredient_id = i.ingredient_id`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).send("에러 발생: " + err.message);
    }
});

// [API 2] Vision AI가 보낸 확정 데이터를 DB에 저장하기
app.post('/vision/add', async (req, res) => {
    const { ingredient_name, quantity, unit, category } = req.body;
    try {
        // 1. 재료 사전에 있는지 확인
        let [ing] = await pool.query('SELECT ingredient_id FROM ingredients WHERE name = ?', [ingredient_name]);
        let ingId;
        
        if (ing.length === 0) {
            const [newIng] = await pool.query('INSERT INTO ingredients (name, category) VALUES (?, ?)', [ingredient_name, category]);
            ingId = newIng.insertId;
        } else {
            ingId = ing[0].ingredient_id;
        }

        // 2. 냉장고 재고에 저장
        await pool.query('INSERT INTO fridge_items (ingredient_id, quantity, unit) VALUES (?, ?, ?)', [ingId, quantity, unit]);
        res.json({ message: "냉장고에 성공적으로 저장되었습니다!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "데이터 저장 중 오류가 발생했습니다." });
    }
});

// [API 3] 프론트엔드 수동 재료 추가용
app.post('/fridge/add', async (req, res) => {
    const { ingredient_id, quantity } = req.body;
    try {
        const sql = 'INSERT INTO fridge_items (ingredient_id, quantity) VALUES (?, ?)';
        await pool.query(sql, [ingredient_id, quantity]);
        res.json({ message: "프론트엔드에서 성공적으로 저장했습니다!" });
    } catch (err) {
        res.status(500).json(err);
    }
});

// 서버 실행 (반드시 파일의 가장 맨 밑에 있어야함)
app.listen(3000, () => {
    console.log("🚀 서버 가동 시작! 브라우저를 확인하세요.");
});