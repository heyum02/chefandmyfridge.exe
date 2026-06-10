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

async function getFridgeIngredients(userId = 1) {
    const query = `
        SELECT
            i.name,
            i.category,
            CAST(f.quantity AS CHAR) AS amount,
            COALESCE(f.unit, '') AS unit
        FROM fridge_items f
        JOIN ingredients i ON f.ingredient_id = i.ingredient_id
        WHERE f.user_id = ?
        ORDER BY f.added_at DESC, f.item_id DESC
    `;
    const [rows] = await pool.query(query, [userId]);
    return rows;
}

function runPythonJsonScript(scriptPath, payload) {
    return new Promise((resolve, reject) => {
        const python = spawn('python3', [scriptPath], {
            cwd: __dirname,
            env: process.env,
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('error', (error) => {
            reject(error);
        });

        python.on('close', (code) => {
            if (code !== 0) {
                return reject(
                    new Error(stderr.trim() || stdout.trim() || `Python exited with code ${code}`)
                );
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

// [API 1] 냉장고 전체 재고 조회 (명세서 완벽 일치)
app.get('/api/fridge', async (req, res) => {
    try {
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
        const hasExpiryDate = await hasExpiryDateColumn();

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
        const sql = hasExpiryDate
            ? 'INSERT INTO fridge_items (ingredient_id, quantity, unit, expiry_date) VALUES (?, ?, ?, ?)'
            : 'INSERT INTO fridge_items (ingredient_id, quantity, unit) VALUES (?, ?, ?)';
        const params = hasExpiryDate
            ? [ingId, amount, unit, expiryDate || null]
            : [ingId, amount, unit];
        const [result] = await pool.query(sql, params);

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
        const hasExpiryDate = await hasExpiryDateColumn();

        if (!hasExpiryDate) {
            return res.status(400).json({ error: "expiry_date 컬럼이 없어 소비기한을 수정할 수 없습니다." });
        }

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

// [API 6] 레시피 추천
app.post('/api/recipe/recommend', async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, 'LLM', 'prompt', 'recommend_api.py');
        const userId = Number(req.body?.userId) || 1;
        const fridgeIngredients = await getFridgeIngredients(userId);

        const payload = {
            ingredients: fridgeIngredients,
            query: req.body?.query,
            allergies: req.body?.allergies || [],
            cookingTools: req.body?.cookingTools || [],
            cookingHistory: req.body?.cookingHistory || [],
            maxResults: req.body?.maxResults || 5,
        };

        const result = await runPythonJsonScript(scriptPath, payload);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: '레시피 추천 API 실행 중 오류가 발생했습니다.',
            detail: err.message,
        });
    }
});

// [API 7] 레시피 상세
app.post('/api/recipe/detail', async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, 'LLM', 'prompt', 'detail_api.py');
        const userId = Number(req.body?.userId) || 1;
        const fridgeIngredients = await getFridgeIngredients(userId);

        const payload = {
            recipeName: req.body?.recipeName,
            ingredients: fridgeIngredients,
            missingIngredients: req.body?.missingIngredients || [],
            allergies: req.body?.allergies || [],
            selectedTools: req.body?.selectedTools || req.body?.cookingTools || [],
            cookingHistory: req.body?.cookingHistory || [],
            conversationHistory: req.body?.conversationHistory || [],
            nutritionFocus: req.body?.nutritionFocus || null,
        };

        const result = await runPythonJsonScript(scriptPath, payload);

        if (!result.success) {
            return res.status(500).json(result);
        }

        const sessionId = crypto.randomUUID();
        const sessionContext = {
            ...(result.sessionContext || {}),
            conversationHistory: [
                ...(result.sessionContext?.conversationHistory || []),
                {
                    role: 'user',
                    content: `레시피 상세 요청: ${payload.recipeName || ''}`,
                },
                {
                    role: 'assistant',
                    content: JSON.stringify(result.data),
                },
            ],
            previousRecipeResponse: JSON.stringify(result.data),
        };

        recipeChatSessions.set(sessionId, sessionContext);

        res.json({
            ...result,
            sessionId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: '레시피 상세 API 실행 중 오류가 발생했습니다.',
            detail: err.message,
        });
    }
});

// [API 8] 레시피 후속 대화
app.post('/api/recipe/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body || {};

        if (!sessionId || !message) {
            return res.status(400).json({
                success: false,
                error: 'sessionId와 message는 필수입니다.',
            });
        }

        const session = recipeChatSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: '유효한 레시피 대화 세션을 찾을 수 없습니다.',
            });
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

        if (!result.success) {
            return res.status(500).json(result);
        }

        session.conversationHistory = [
            ...(session.conversationHistory || []),
            { role: 'user', content: message },
            { role: 'assistant', content: JSON.stringify(result.data) },
        ];
        recipeChatSessions.set(sessionId, session);

        res.json({
            ...result,
            sessionId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: '레시피 후속 대화 API 실행 중 오류가 발생했습니다.',
            detail: err.message,
        });
    }
});

// ==========================================
// [도메인 3] 유저 인증 및 마이페이지 (Option C)
// ==========================================

// [API 9] 회원가입 (명세서 일치)
app.post('/api/auth/signup', async (req, res) => {
    const { email, nickname, password, allergies, kitchenTools, tastes } = req.body;
    try {
        const sql = `INSERT INTO user_profile (email, password, nickname, allergies, kitchen_tools, preferred_ingredients)
                     VALUES (?, ?, ?, ?, ?, ?)`;

        // 배열 데이터는 텍스트(JSON)로 변환해서 저장
        await pool.query(sql, [email, password, nickname, JSON.stringify(allergies), JSON.stringify(kitchenTools), JSON.stringify(tastes)]);

        res.json({ message: "이메일과 맞춤 설정 데이터를 받아 회원가입을 처리했습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "회원가입 중 오류가 발생했습니다. (이미 가입된 이메일일 수 있습니다.)" });
    }
});

// [API 10] 로그인 (명세서 일치)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM user_profile WHERE email = ? AND password = ?', [email, password]);

        if (users.length === 0) {
            return res.status(401).json({ error: "이메일이나 비밀번호가 일치하지 않습니다." });
        }

        const user = users[0];
        // 프론트엔드가 요구하는 데이터 형태 그대로 반환
        res.json({
            token: "dummy-token-for-capstone", // 테스트용 임시 토큰
            nickname: user.nickname,
            isPremium: false,
            freeCount: 5,
            allergies: JSON.parse(user.allergies || '[]'),
            kitchenTools: JSON.parse(user.kitchen_tools || '[]'),
            tastes: JSON.parse(user.preferred_ingredients || '[]')
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다." });
    }
});

// [API 11] 마이페이지 맞춤 설정 변경 (명세서 일치)
app.put('/api/user/profile', async (req, res) => {
    const { allergies, kitchenTools, tastes } = req.body;
    try {
        // 테스트용으로 1번 유저의 설정을 업데이트
        const sql = 'UPDATE user_profile SET allergies = ?, kitchen_tools = ?, preferred_ingredients = ? WHERE user_id = 1';
        await pool.query(sql, [JSON.stringify(allergies), JSON.stringify(kitchenTools), JSON.stringify(tastes)]);

        res.json({ message: "마이페이지에서 내 입맛 및 주방 설정을 수정했습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "프로필 수정 중 오류가 발생했습니다." });
    }
});

// ==========================================
// [도메인 4] 요리 완료 기록 및 피드백 (Option C)
// ==========================================

// [API 12] 요리 완료 기록 저장 (명세서 일치)
app.post('/api/recipe/history', async (req, res) => {
    const { name, date, rating, comment, tasteFeedback } = req.body;
    try {
        const sql = 'INSERT INTO user_feedback (user_id, recipe_name, rating, comment, taste_feedback) VALUES (?, ?, ?, ?, ?)';
        // tasteFeedback은 객체 형태이므로 텍스트(JSON)로 변환
        await pool.query(sql, [1, name, rating, comment, JSON.stringify(tasteFeedback)]);

        res.json({ message: "홈 화면용 요리 기록 및 6단계 입맛 피드백을 저장했습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "요리 기록 저장 중 오류가 발생했습니다." });
    }
});

// [API 13] 요리 기록 수정 (명세서 일치)
app.put('/api/recipe/history/:id', async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    try {
        const sql = 'UPDATE user_feedback SET rating = ?, comment = ? WHERE feedback_id = ?';
        await pool.query(sql, [rating, comment, id]);

        res.json({ message: "홈 화면에 저장된 요리 기록(별점, 코멘트)을 수정했습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "요리 기록 수정 중 오류가 발생했습니다." });
    }
});

// [API 14] 요리 기록 삭제 (명세서 일치)
app.delete('/api/recipe/history/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = 'DELETE FROM user_feedback WHERE feedback_id = ?';
        await pool.query(sql, [id]);

        res.json({ message: "홈 화면에 저장된 요리 기록을 삭제했습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "요리 기록 삭제 중 오류가 발생했습니다." });
    }
});

// ==========================================
// [추가 피드백 API] 재고 차감 및 즐겨찾기
// ==========================================

// [API 15] 요리 후 재고 자동 차감
app.post('/api/fridge/deduct', async (req, res) => {
    // 프론트에서 [{ id: 1, usedAmount: 2 }, { id: 3, usedAmount: 1 }] 형태로 배열을 보낸다고 가정
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "차감할 식재료 데이터가 올바르지 않습니다." });
    }

    try {
        // 배열을 돌면서 각각의 식재료 수량을 깎음
        for (let item of items) {
            const sql = 'UPDATE fridge_items SET quantity = quantity - ? WHERE item_id = ?';
            await pool.query(sql, [item.usedAmount, item.id]);
        }

        // (센스 옵션!) 수량이 0 이하가 된 다 쓴 식재료는 냉장고에서 자동 삭제
        await pool.query('DELETE FROM fridge_items WHERE quantity <= 0');

        res.json({ message: "사용한 식재료만큼 재고가 차감되었습니다." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "재고 차감 중 오류가 발생했습니다." });
    }
});

// [API 16] 레시피 즐겨찾기 ON/OFF
app.put('/api/recipe/history/:id/bookmark', async (req, res) => {
    const { id } = req.params; // 요리 기록(feedback) ID
    const { isBookmark } = req.body; // true(즐겨찾기 켬) 또는 false(끔)

    try {
        const sql = 'UPDATE user_feedback SET is_bookmark = ? WHERE feedback_id = ?';
        // boolean 값(true/false)을 DB에 넣기 위해 1 또는 0으로 변환
        await pool.query(sql, [isBookmark ? 1 : 0, id]);

        res.json({ message: `레시피 즐겨찾기가 ${isBookmark ? '설정' : '해제'}되었습니다.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "즐겨찾기 업데이트 중 오류가 발생했습니다." });
    }
});

// 배포 확인용 간단한 헬스 체크
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 서버 실행 (반드시 파일의 가장 맨 밑에 있어야함)
app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});
