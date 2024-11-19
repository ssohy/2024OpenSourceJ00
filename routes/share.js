const express = require('express');
const router = express.Router();
const client  = require('../db/db_connect'); // MySQL 클라이언트 사용
const USER_COOKIE_KEY = 'USER';
const cron = require('node-cron');
const moment = require('moment-timezone');

// const resetCheeringValues = () => {
//     console.log('Manually resetting cheering values to 0');
//     client.query('UPDATE user SET cheering = 0', (err, results) => {
//         if (err) {
//             console.error('Error resetting cheering values:', err);
//         } else {
//             console.log('Cheering values reset successfully');
//         }
//     });
// };

// // 수동 실행 테스트
// resetCheeringValues();

// 자정마다 사용자의 cheering 초기화
cron.schedule('0 0 * * *', () => {
    const now = moment().tz('Asia/Seoul').format('HH:mm');
    console.log(`Current time: ${now}`);
    if (now === '00:00') {
        console.log('Resetting cheering values to 0 at KST midnight');
        client.query('UPDATE user SET cheering = 0', (err, results) => {
            if (err) {
                console.error('Error resetting cheering values:', err);
            } else {
                console.log('Cheering values reset successfully');
            }
        });
    }
});

// 응원하기 코드
router.post('/cheer', async (req, res) => {
    const userCookie = req.cookies[USER_COOKIE_KEY];
    if (!userCookie) {
        console.log('User not authenticated');
        return res.status(401).json({ msg: 'Not authenticated' });
    }
    const from_user_id = JSON.parse(userCookie).user_id;
    const { to_user_id } = req.body;
    const todayKST = moment().tz('Asia/Seoul').format('YYYY-MM-DD')

    console.log(`Cheering from ${from_user_id} to ${to_user_id}`);

    try {
        // 오늘 이미 응원했는지 확인
        const checkQuery = 'SELECT * FROM cheering_log WHERE from_user_id = ? AND to_user_id = ? AND cheer_date = ?';
        const checkResult = await queryAsync(checkQuery, [from_user_id, to_user_id, todayKST]);

        if (checkResult.length > 0) {
            return res.status(400).json({ msg: '하루에 한 번만 응원할 수 있어요' });
        }

        // cheering 값을 증가시키는 쿼리
        const updateQuery = 'UPDATE user SET cheering = cheering + 1 WHERE user_id = ?';
        await queryAsync(updateQuery, [to_user_id]);

        // cheering_log 테이블에 기록 추가
        const logQuery = 'INSERT INTO cheering_log (from_user_id, to_user_id, cheer_date) VALUES (?, ?, ?)';
        await queryAsync(logQuery, [from_user_id, to_user_id, todayKST]);

        res.status(200).json({ msg: 'Cheered successfully' });
    } catch (err) {
        console.error('Error updating cheering:', err.message);
        res.status(500).send('Server error');
    }
});

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

async function fetchUser(user_id) {
    console.log("Querying database for user with id:", user_id);
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM user WHERE user_id = ?', [user_id], (err, results) => {
            if (err) {
                return reject(err); 
            }
            resolve(results[0]);
        });
    });
}

router.get('/currentUserId', async (req, res) => {
    const userCookie = req.cookies[USER_COOKIE_KEY];
    if (!userCookie) {
        return res.status(401).json({ msg: 'Not authenticated' });
    }

    const userData = JSON.parse(userCookie);
    const userId = userData.user_id;

    try {
        res.status(200).json({ user_id: userId });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로잉 전체 수 가져오기
router.get('/followingCount', async (req, res) => {
    const userId = req.query.userId;

    try {
        const query = 'SELECT COUNT(*) AS totalFollowing FROM follow WHERE from_user_id = ?';
        const results = await queryAsync(query, [userId]);

        res.status(200).json({ totalFollowing: results[0].totalFollowing });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로워 전체 수 가져오기
router.get('/followersCount', async (req, res) => {
    const userId = req.query.userId;

    try {
        const query = 'SELECT COUNT(*) AS totalFollowers FROM follow WHERE to_user_id = ?';
        const results = await queryAsync(query, [userId]);

        res.status(200).json({ totalFollowers: results[0].totalFollowers });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로잉 리스트 가져오기 (페이지네이션)
router.get('/followingList', async (req, res) => {
    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const query = 'SELECT to_user_id FROM follow WHERE from_user_id = ? LIMIT ? OFFSET ?';
        const results = await queryAsync(query, [userId, limit, offset]);

        const countQuery = 'SELECT COUNT(*) AS total FROM follow WHERE from_user_id = ?';
        const countResults = await queryAsync(countQuery, [userId]);

        const userIds = results.map(row => row.to_user_id);
        const totalPages = Math.ceil(countResults[0].total / limit);

        res.status(200).json({ followingList: userIds, totalPages });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로워 리스트 가져오기 (페이지네이션)
router.get('/followersList', async (req, res) => {
    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const query = 'SELECT from_user_id FROM follow WHERE to_user_id = ? LIMIT ? OFFSET ?';
        const results = await queryAsync(query, [userId, limit, offset]);

        const countQuery = 'SELECT COUNT(*) AS total FROM follow WHERE to_user_id = ?';
        const countResults = await queryAsync(countQuery, [userId]);

        const userIds = results.map(row => row.from_user_id);
        const totalPages = Math.ceil(countResults[0].total / limit);

        res.status(200).json({ followersList: userIds, totalPages });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 팔로워 삭제하기
router.post('/removeFollower', async (req, res) => {
    const userCookie = req.cookies[USER_COOKIE_KEY];
    if (!userCookie) {
        return res.status(401).json({ msg: 'Not authenticated' });
    }
    const to_user_id = JSON.parse(userCookie).user_id; // 현재 사용자의 ID
    const { from_user_id } = req.body; // 삭제할 팔로워의 ID

    try {
        const follower = await fetchUser(from_user_id);
        const following = await fetchUser(to_user_id);

        if (!follower || !following) {
            return res.status(400).json({ msg: 'User not found' });
        }

        const query = 'DELETE FROM follow WHERE from_user_id = ? AND to_user_id = ?';
        await queryAsync(query, [from_user_id, to_user_id]);

        console.log("Follower removed successfully");
        res.status(200).json({ msg: 'Follower removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 언팔로우하기
router.post('/unfollow', async (req, res) => {
    const userCookie = req.cookies[USER_COOKIE_KEY];
    if (!userCookie) {
        return res.status(401).json({ msg: 'Not authenticated' });
    }
    const from_user_id = JSON.parse(userCookie).user_id;
    const { to_user_id } = req.body;

    try {
        const follower = await fetchUser(from_user_id);
        const following = await fetchUser(to_user_id);

        if (!follower || !following) {
            return res.status(400).json({ msg: 'User not found' });
        }

        const query = 'DELETE FROM follow WHERE from_user_id = ? AND to_user_id = ?';
        await queryAsync(query, [from_user_id, to_user_id]);

        console.log("Unfollowed successfully");
        res.status(200).json({ msg: 'Unfollowed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 맞팔로우 상태 확인
router.get('/checkMutualFollow', async (req, res) => {
    const { currentUserId, targetUserId } = req.query;

    try {
        const query = `SELECT * FROM follow WHERE from_user_id = ? AND to_user_id = ?`;
        const results = await queryAsync(query, [targetUserId, currentUserId]);
        const mutualFollow = results.length > 0;

        res.json({ mutualFollow });
    } catch (error) {
        console.error('Error checking mutual follow status:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;