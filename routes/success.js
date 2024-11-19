const express = require('express');
const router = express.Router();
const client = require('../db/db_connect'); // MySQL 클라이언트 사용
const USER_COOKIE_KEY = 'USER';

async function queryAsync(query, params) {
    return new Promise((resolve, reject) => {
        client.query(query, params, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

router.post('/update-membership', async (req, res) => {
    const userCookie = req.cookies[USER_COOKIE_KEY];

    if (!userCookie) {
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    const userId = JSON.parse(userCookie).user_id;

    try {
        // 사용자의 멤버십 상태를 업데이트하는 쿼리
        const query = 'UPDATE user SET membership = ? WHERE user_id = ?';
        const result = await queryAsync(query, [1, userId]);

        // 업데이트된 행의 수를 확인
        if (result.affectedRows > 0) {
            console.log("Membership updated successfully");
            res.status(200).json({ success: true, message: '멤버십 업데이트 완료' });
        } else {
            console.log("No user found with the provided user_id");
            res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error('Error updating membership:', error.message);
        console.error('Error code:', error.code); // SQL 오류 코드
        console.error('SQL Message:', error.sqlMessage); // SQL 오류 메시지
        console.error('SQL:', error.sql); // 실행된 SQL 쿼리
        
        res.status(500).json({ 
            success: false, 
            message: '멤버십 업데이트 실패', 
            error: {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage,
                sql: error.sql
            }
        });
    }
});

module.exports = router;