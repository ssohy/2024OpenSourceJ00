const express = require('express');
const router = express.Router();
const  client  = require('../db/db_connect'); // MySQL 클라이언트 사용

router.get('/', (req, res) => {
    res.render('calendar', { title: 'Calendar' });
});

router.get('/details/:date', (req, res) => {
    const { date } = req.params;
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;

    if (user) {
        const query = `
            SELECT t.tedolist_number, t.tedolist_detail, 
                    GROUP_CONCAT(CONCAT(c.checklist_id, ':', c.checklist_detail, ':', c.is_checked) SEPARATOR ';') AS checklists
            FROM tedolist t
            LEFT JOIN checklist c ON t.tedolist_number = c.tedolist_number AND t.mandalart_id = c.mandalart_id AND c.date = ?
            WHERE t.mandalart_id = (SELECT mandalart_id FROM mandalart WHERE user_id = ?)
            GROUP BY t.tedolist_number, t.tedolist_detail
        `;

        client.query(query, [date, user.user_id], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ error: 'Database query error' });
            }

            if (results.length === 0) {
                // 데이터가 없는 경우 빈 목록을 반환
                return res.json({ tedolist: [] });
            }

            const tedolist = results.map(row => ({
                tedolist_number: row.tedolist_number,
                detail: row.tedolist_detail,
                checklists: row.checklists ? row.checklists.split(';').map(cl => {
                    const [checklist_id, checklist_detail, is_checked] = cl.split(':');
                    return { 
                        checklist_id: parseInt(checklist_id, 10), 
                        detail: checklist_detail, 
                        is_checked: is_checked === '1' // 문자열 '1'을 불리언 true로 변환
                    };
                }) : []
            }));

            res.json({ tedolist });
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

module.exports = router;