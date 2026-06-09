const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');

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

let hasExpiryDateColumnCache;
const recipeChatSessions = new Map();

async function hasExpiryDateColumn() {
    if (typeof hasExpiryDateColumnCache === 'boolean') {
        return hasExpiryDateColumnCache;
    }
    const [columns] = await pool.query("SHOW COLUMNS FROM fridge_items LIKE 'expiry_date'");
    hasExpiryDateColumnCache = columns.length > 0;
    return hasExpiryDateColumnCache;
}

// OS 환경에 따라 파이썬 명령어 분기 (윈도우 크래시 방지 방어막)
const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

function runPythonJsonScript(scriptPath, payload) {
    return new Promise((resolve, reject) => {
        const python = spawn(pythonCommand, [scriptPath], {
            cwd: __dirname,
            env: process.env,
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => { stdout += data.toString(); });
        python.stderr.on('data', (data) => { stderr += data.toString(); });
        python.on('error', (error) => { reject(error); });
        python.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(stderr.trim() || stdout.trim() || `Python exited with code ${code}`));
            }
            try {
                resolve(JSON.parse(stdout));
            } catch (error) {
                reject(new Error(`Python 응답 JSON 파싱 실패: ${stdout}`));
            }
        });

        python.stdin.write(JSON.stringify(payload || {}));
        python.stdin.end();
    });
}

// ==========================================
// [도메인 1] 냉장고 및 식재료 API
// ==========================================

// [API 1] 냉장고 조회
app.get('/api/fridge', async (req, res) => {
    try {
        const userId = req.query.userId || 1;
        const hasExpiryDate = await hasExpiryDateColumn();
        const query = `
            SELECT 
                f.item_id AS id, 
                i.name, 
                i.category, 
                f.quantity AS amount, 
                f.unit, 
                ${hasExpiryDate ? 'f.expiry_date' : 'NULL'} AS expiryDate
            FROM fridge_items f 
            JOIN ingredients i ON f.ingredient_id = i.ingredient_id
            WHERE f.user_id = ?`;
        const [rows] = await pool.query(query, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).send("에러 발생: " + err.message);
    }
});

// [API 2] 식재료 수동 추가
app.post('/api/fridge/add', async (req, res) => {
    const { userId = 1, name, category, amount, unit, expiryDate } = req.body;
    try {
        const hasExpiryDate = await hasExpiryDateColumn();
        let [ing] = await pool.query('SELECT ingredient_id FROM ingredients WHERE name = ?', [name]);
        let ingId;
        
        if (ing.length === 0) {
            const [newIng] = await pool.query('INSERT INTO ingredients (name, category) VALUES (?, ?)', [name, category]);
            ingId = newIng.insertId;
        } else {
            ingId = ing[0].ingredient_id;
        }

        const sql = hasExpiryDate
            ? 'INSERT INTO fridge_items (user_id, ingredient_id, quantity, unit, expiry_date) VALUES (?, ?, ?, ?, ?)'
            : 'INSERT INTO fridge_items (user_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)';
        const params = hasExpiryDate
            ? [userId, ingId, amount, unit, expiryDate || null]
            : [userId, ingId, amount, unit];
        const [result] = await pool.query(sql, params);
        
        res.json({ id: result.insertId, message: "식재료가 수동으로 추가되었습니다!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "데이터 저장 중 오류가 발생했습니다." });
    }
});

// [API 3] Vision AI 데이터 저장
app.post('/vision/add', async (req, res) => {
    const { userId = 1, name, category, quantity, unit } = req.body;
    try {
        let [ing] = await pool.query('SELECT ingredient_id FROM ingredients WHERE name = ?', [name]);
        let ingId;
        
        if (ing.length === 0) {
            const [newIng] = await pool.query('INSERT INTO ingredients (name, category) VALUES (?, ?)', [name, category]);
            ingId = newIng.insertId;
        } else {
            ingId = ing[0].ingredient_id;
        }

        await pool.query('INSERT INTO fridge_items (user_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)', [userId, ingId, quantity, unit]);
        res.json({ message: "Vision AI 데이터가 성공적으로 저장되었습니다!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "데이터 저장 중 오류가 발생했습니다." });
    }
});

// [API 4] 식재료 전체 수정
app.put('/api/fridge/:item_id', async (req, res) => {
    const { item_id } = req.params; 
    const { name, category, amount, unit, expiryDate } = req.body; 

    try {
        const hasExpiryDate = await hasExpiryDateColumn();

        let [ing] = await pool.query('SELECT ingredient_id FROM ingredients WHERE name = ?', [name]);
        let ingId;
        
        if (ing.length === 0) {
            const [newIng] = await pool.query('INSERT INTO ingredients (name, category) VALUES (?, ?)', [name, category]);
            ingId = newIng.insertId;
        } else {
            ingId = ing[0].ingredient_id;
        }

        const sql = hasExpiryDate
            ? 'UPDATE fridge_items SET ingredient_id = ?, quantity = ?, unit = ?, expiry_date = ? WHERE item_id = ?'
            : 'UPDATE fridge_items SET ingredient_id = ?, quantity = ?, unit = ? WHERE item_id = ?';
        
        const params = hasExpiryDate
            ? [ingId, amount, unit, expiryDate || null, item_id]
            : [ingId, amount, unit, item_id];
            
        await pool.query(sql, params);
        
        res.json({ message: "식재료의 상세 정보가 모두 수정되었습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "식재료 수정 중 오류가 발생했습니다." });
    }
});

// [API 5] 식재료 삭제
app.delete('/api/fridge/:item_id', async (req, res) => {
    const { item_id } = req.params; 
    try {
        await pool.query('DELETE FROM fridge_items WHERE item_id = ?', [item_id]);
        res.json({ message: "다 쓰거나 버린 식재료를 냉장고에서 삭제했습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "식재료 삭제 중 오류가 발생했습니다." });
    }
});

// [API 15] 요리 후 재고 차감
app.post('/api/fridge/deduct', async (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "차감할 식재료 데이터가 올바르지 않습니다." });
    }
    try {
        for (let item of items) {
            await pool.query('UPDATE fridge_items SET quantity = quantity - ? WHERE item_id = ?', [item.usedAmount, item.id]);
        }
        await pool.query('DELETE FROM fridge_items WHERE quantity <= 0');
        res.json({ message: "사용한 식재료만큼 재고가 차감되었습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "재고 차감 중 오류가 발생했습니다." });
    }
});

// ==========================================
// [도메인 2] AI 레시피 및 챗봇 API
// ==========================================

// [API 6] 레시피 추천
app.post('/api/recipe/recommend', async (req, res) => {
    try {
        const userId = req.body.userId || 1;
        
        const [fridgeRows] = await pool.query(`
            SELECT i.name 
            FROM fridge_items f 
            JOIN ingredients i ON f.ingredient_id = i.ingredient_id 
            WHERE f.user_id = ? AND f.quantity > 0`, [userId]);
        const realIngredients = fridgeRows.map(row => row.name);

        const scriptPath = path.join(__dirname, 'LLM', 'prompt', 'recommend_api.py');
        const payload = {
            query: req.body?.query,
            ingredients: realIngredients, 
            allergies: req.body?.allergies || [],
            cookingTools: req.body?.cookingTools || [],
            cookingHistory: req.body?.cookingHistory || [],
            maxResults: req.body?.maxResults || 5,
        };

        const result = await runPythonJsonScript(scriptPath, payload);
        if (!result.success) { return res.status(500).json(result); }
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: '레시피 추천 오류', detail: err.message });
    }
});

// [API 7] 레시피 상세
app.post('/api/recipe/detail', async (req, res) => {
    try {
        const userId = req.body.userId || 1;
        
        const [fridgeRows] = await pool.query(`
            SELECT i.name 
            FROM fridge_items f 
            JOIN ingredients i ON f.ingredient_id = i.ingredient_id 
            WHERE f.user_id = ? AND f.quantity > 0`, [userId]);
        const realIngredients = fridgeRows.map(row => row.name);

        const scriptPath = path.join(__dirname, 'LLM', 'prompt', 'detail_api.py');
        const payload = {
            recipeName: req.body?.recipeName,
            ingredients: realIngredients, 
            missingIngredients: req.body?.missingIngredients || [],
            allergies: req.body?.allergies || [],
            selectedTools: req.body?.selectedTools || req.body?.cookingTools || [],
            cookingHistory: req.body?.cookingHistory || [],
            conversationHistory: req.body?.conversationHistory || [],
            nutritionFocus: req.body?.nutritionFocus || null,
        };

        const result = await runPythonJsonScript(scriptPath, payload);
        if (!result.success) { return res.status(500).json(result); }

        const sessionId = crypto.randomUUID();
        const sessionContext = {
            ...(result.sessionContext || {}),
            conversationHistory: [
                ...(result.sessionContext?.conversationHistory || []),
                { role: 'user', content: `레시피 상세 요청: ${payload.recipeName || ''}` },
                { role: 'assistant', content: JSON.stringify(result.data) },
            ],
            previousRecipeResponse: JSON.stringify(result.data),
        };
        recipeChatSessions.set(sessionId, sessionContext);

        res.json({ ...result, sessionId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: '레시피 상세 오류', detail: err.message });
    }
});

// [API 8] 레시피 후속 대화
app.post('/api/recipe/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body || {};
        if (!sessionId || !message) {
            return res.status(400).json({ success: false, error: 'sessionId와 message는 필수입니다.' });
        }

        const session = recipeChatSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: '유효한 세션을 찾을 수 없습니다.' });
        }

        const scriptPath = path.join(__dirname, 'LLM', 'prompt', 'chat_api.py');
        const payload = {
            recipeName: session.recipeName,
            previousRecipeResponse: session.previousRecipeResponse,
            userMessage: message,
            ragContext: session.ragContext,
            substitutionContext: session.substitutionContext,
            availableIngredients: session.availableIngredients || [],
            allergies: session.allergies || [],
            selectedTools: session.selectedTools || [],
            cookingHistory: session.cookingHistory || [],
            conversationHistory: session.conversationHistory || [],
        };

        const result = await runPythonJsonScript(scriptPath, payload);
        if (!result.success) { return res.status(500).json(result); }

        session.conversationHistory = [
            ...(session.conversationHistory || []),
            { role: 'user', content: message },
            { role: 'assistant', content: JSON.stringify(result.data) },
        ];
        session.previousRecipeResponse = JSON.stringify(result.data);
        recipeChatSessions.set(sessionId, session);

        res.json({ ...result, sessionId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: '레시피 후속 대화 오류', detail: err.message });
    }
});

// ==========================================
// [도메인 3] 유저 인증 및 마이페이지
// ==========================================

// [API 9] 회원가입
app.post('/api/auth/signup', async (req, res) => {
    const { email, nickname, password, allergies, kitchenTools, tastes } = req.body;
    try {
        const sql = `INSERT INTO user_profile (email, password, nickname, allergies, kitchen_tools, preferred_ingredients) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [email, password, nickname, JSON.stringify(allergies), JSON.stringify(kitchenTools), JSON.stringify(tastes)]);
        res.json({ message: "회원가입 완료" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "회원가입 오류 (이메일 중복 등)" });
    }
});

// [API 10] 로그인
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM user_profile WHERE email = ? AND password = ?', [email, password]);
        if (users.length === 0) {
            return res.status(401).json({ error: "이메일이나 비밀번호 불일치" });
        }
        const user = users[0];
        res.json({
            userId: user.user_id, 
            token: "dummy-token-for-capstone",
            nickname: user.nickname,
            isPremium: user.is_premium === 1, // DB 값 반영
            freeCount: user.free_count,       // DB 값 반영
            allergies: JSON.parse(user.allergies || '[]'),
            kitchenTools: JSON.parse(user.kitchen_tools || '[]'),
            tastes: JSON.parse(user.preferred_ingredients || '[]')
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "로그인 오류" });
    }
});

// [API 11] 마이페이지 맞춤 설정 변경
app.put('/api/user/profile', async (req, res) => {
    const { userId = 1, allergies, kitchenTools, tastes } = req.body;
    try {
        const sql = 'UPDATE user_profile SET allergies = ?, kitchen_tools = ?, preferred_ingredients = ? WHERE user_id = ?';
        await pool.query(sql, [JSON.stringify(allergies), JSON.stringify(kitchenTools), JSON.stringify(tastes), userId]);
        res.json({ message: "마이페이지 수정 완료" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "프로필 수정 오류" });
    }
});

// ==========================================
// [도메인 4] 요리 완료 기록 및 피드백
// ==========================================

// [API 12] 요리 완료 기록 저장
app.post('/api/recipe/history', async (req, res) => {
    const { userId = 1, name, date, rating, comment, tasteFeedback } = req.body;
    try {
        const sql = 'INSERT INTO user_feedback (user_id, recipe_name, rating, comment, taste_feedback) VALUES (?, ?, ?, ?, ?)';
        await pool.query(sql, [userId, name, rating, comment, JSON.stringify(tasteFeedback)]);
        res.json({ message: "요리 기록 저장 완료" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "요리 기록 저장 오류" });
    }
});

// [API 13] 요리 기록 수정
app.put('/api/recipe/history/:id', async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    try {
        const sql = 'UPDATE user_feedback SET rating = ?, comment = ? WHERE feedback_id = ?';
        await pool.query(sql, [rating, comment, id]);
        res.json({ message: "요리 기록 수정 완료" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "요리 기록 수정 오류" });
    }
});

// [API 14] 요리 기록 삭제
app.delete('/api/recipe/history/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM user_feedback WHERE feedback_id = ?', [id]);
        res.json({ message: "요리 기록 삭제 완료" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "요리 기록 삭제 오류" });
    }
});

// [API 16] 레시피 즐겨찾기 ON/OFF
app.put('/api/recipe/history/:id/bookmark', async (req, res) => {
    const { id } = req.params;
    const { isBookmark } = req.body;
    try {
        await pool.query('UPDATE user_feedback SET is_bookmark = ? WHERE feedback_id = ?', [isBookmark ? 1 : 0, id]);
        res.json({ message: `레시피 즐겨찾기가 ${isBookmark ? '설정' : '해제'}되었습니다.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "즐겨찾기 업데이트 오류" });
    }
});

// ==========================================
// [도메인 5] 비즈니스 모델 API (실제 DB 연동 완료)
// ==========================================

// [API 17] 프리미엄 구독 완료 처리
app.put('/api/user/subscribe', async (req, res) => {
    const { userId = 1 } = req.body;
    try {
        await pool.query('UPDATE user_profile SET is_premium = 1 WHERE user_id = ?', [userId]);
        res.json({ message: "프리미엄 구독 결제가 완료되었습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "프리미엄 구독 처리 오류" });
    }
});

// [API 18] 광고 시청 보상 지급 (무료 이용 횟수 +5회 충전)
app.put('/api/user/reward', async (req, res) => {
    const { userId = 1 } = req.body;
    try {
        await pool.query('UPDATE user_profile SET free_count = free_count + 5 WHERE user_id = ?', [userId]);
        res.json({ message: "광고 시청 보상으로 무료 레시피 생성 횟수가 지급되었습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "광고 보상 지급 오류" });
    }
});

// 배포 확인용 간단한 헬스 체크
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 서버 실행
app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});