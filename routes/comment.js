const express = require('express');
const router = express.Router();
const client = require('../db/db_connect'); // MySQL 클라이언트 사용
const { v4: uuidv4 } = require('uuid');

// 댓글 작성
router.post('/add', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;

    if (user) {
        const { mandalart_id, comment_detail } = req.body;
        const comment_id = uuidv4();
        const date = new Date();
        
        client.query(
            "INSERT INTO comment (mandalart_id, user_id, comment_id, date, comment_detail) VALUES (?, ?, ?, ?, ?)",
            [mandalart_id, user.user_id, comment_id, date, comment_detail],
            (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Server error");
                } else {
                    res.json({ success: true });
                }
            }
        );
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// 댓글 조회
router.get('/:mandalart_id', (req, res) => {
    const { mandalart_id } = req.params;

    // user 테이블과 comment 테이블을 조인하여 user_image를 가져옴
    const query = `
        SELECT c.*, u.user_nickname, u.user_image
        FROM comment c
        LEFT JOIN user u ON c.user_id = u.user_id
        WHERE c.mandalart_id = ?
        ORDER BY c.date ASC
    `;

    client.query(query, [mandalart_id], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Server error");
        } else {
            // 날짜를 변환하여 결과 객체의 date 필드를 업데이트
            const comments = result.map(comment => {
                const formattedDate = new Intl.DateTimeFormat('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Asia/Seoul'
                }).format(comment.date);

                return { ...comment, date: formattedDate };
            });

            res.json(comments);
        }
    });
});


// 댓글 삭제
router.delete('/delete/:comment_id', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;
    const { comment_id } = req.params;

    if (user) {
        client.query("DELETE FROM comment WHERE comment_id = ? AND user_id = ?", [comment_id, user.user_id], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                res.json({ success: true });
            }
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// 댓글 반응 증가
router.post('/reaction/increment', (req, res) => {
    const { comment_id, emoji } = req.body;
    const emojiColumn = `imogi${emoji}count`;

    client.query(
        `UPDATE comment SET ${emojiColumn} = ${emojiColumn} + 1 WHERE comment_id = ?`,
        [comment_id],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                res.json({ success: true });
            }
        }
    );
});

module.exports = router;