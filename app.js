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

        // TODO: DB 구현 이후 재료 조회 결과로 교체 예정
        // 현재는 요청 body의 ingredients를 무시하고 Python 내부 mock 재료를 사용함
        const payload = {
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

        // TODO: DB 구현 이후 재료 조회 결과로 교체 예정
        // 현재는 요청 body의 ingredients를 무시하고 Python 내부 mock 재료를 사용함
        const payload = {
            recipeName: req.body?.recipeName,
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
        session.previousRecipeResponse = JSON.stringify(result.data);
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

// 배포 확인용 간단한 헬스 체크
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 서버 실행 (반드시 파일의 가장 맨 밑에 있어야함)
app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});
