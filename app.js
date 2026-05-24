const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors'); 

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors()); 
app.use(express.json()); 

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// [API 1] 냉장고 전체 재고 조회 (명세서 완벽 일치)
app.get('/api/fridge', async (req, res) => {
    try {
        // 프론트엔드가 요구하는 이름(id, amount, expiryDate 등)으로 바꿔서(AS) 전달
        const query = `
            SELECT 
                f.item_id AS id, 
                i.name, 
                i.category, 
                f.quantity AS amount, 
                f.unit, 
                f.expiry_date AS expiryDate
            FROM fridge_items f 
            JOIN ingredients i ON f.ingredient_id = i.ingredient_id`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).send("에러 발생: " + err.message);
    }
});

// [API 2] 식재료 수동 추가 (명세서 완벽 일치)
app.post('/api/fridge/add', async (req, res) => {
    const { name, category, amount, unit, expiryDate } = req.body;
    try {
        // 1. 재료 사전에 있는지 확인 (Vision AI 로직과 동일하게 변경)
        let [ing] = await pool.query('SELECT ingredient_id FROM ingredients WHERE name = ?', [name]);
        let ingId;
        
        if (ing.length === 0) {
            const [newIng] = await pool.query('INSERT INTO ingredients (name, category) VALUES (?, ?)', [name, category]);
            ingId = newIng.insertId;
        } else {
            ingId = ing[0].ingredient_id;
        }

        // 2. 냉장고 재고에 저장
        const sql = 'INSERT INTO fridge_items (ingredient_id, quantity, unit, expiry_date) VALUES (?, ?, ?, ?)';
        const [result] = await pool.query(sql, [ingId, amount, unit, expiryDate || null]);
        
        // 3. 명세서 조건: 추가된 식재료의 id 반환
        res.json({ id: result.insertId, message: "식재료가 수동으로 추가되었습니다!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "데이터 저장 중 오류가 발생했습니다." });
    }
});

// [API 3] Vision AI 확정 데이터 저장 (명세서 완벽 일치)
app.post('/vision/add', async (req, res) => {
    const { name, category, quantity, unit } = req.body; // 명세서 변수명 맞춤
    try {
        let [ing] = await pool.query('SELECT ingredient_id FROM ingredients WHERE name = ?', [name]);
        let ingId;
        
        if (ing.length === 0) {
            const [newIng] = await pool.query('INSERT INTO ingredients (name, category) VALUES (?, ?)', [name, category]);
            ingId = newIng.insertId;
        } else {
            ingId = ing[0].ingredient_id;
        }

        await pool.query('INSERT INTO fridge_items (ingredient_id, quantity, unit) VALUES (?, ?, ?)', [ingId, quantity, unit]);
        res.json({ message: "Vision AI 데이터가 성공적으로 저장되었습니다!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "데이터 저장 중 오류가 발생했습니다." });
    }
});

// [API 4] 식재료 수정 (소비기한 수정) - 이미 완벽함!
app.put('/api/fridge/:item_id', async (req, res) => {
    const { item_id } = req.params; 
    const { expiryDate } = req.body; 

    try {
        const sql = 'UPDATE fridge_items SET expiry_date = ? WHERE item_id = ?';
        await pool.query(sql, [expiryDate, item_id]);
        
        res.json({ message: "식재료의 소비기한(D-day)이 수정되었습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "식재료 수정 중 오류가 발생했습니다." });
    }
});

// [API 5] 식재료 삭제 - 이미 완벽함!
app.delete('/api/fridge/:item_id', async (req, res) => {
    const { item_id } = req.params; 
    
    try {
        const sql = 'DELETE FROM fridge_items WHERE item_id = ?';
        await pool.query(sql, [item_id]);
        
        res.json({ message: "다 쓰거나 버린 식재료를 냉장고에서 삭제했습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "식재료 삭제 중 오류가 발생했습니다." });
    }
});

// 배포 확인용 간단한 헬스 체크
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 서버 실행 (반드시 파일의 가장 맨 밑에 있어야함)
app.listen(3000, () => {
    console.log("🚀 서버 가동 시작! 브라우저를 확인하세요.");
});
