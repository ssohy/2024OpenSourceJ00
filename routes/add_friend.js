const express = require('express');
const router = express.Router();
const client  = require('../db/db_connect'); // MySQL 클라이언트 사용
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

router.post('/searchUser', async (req, res) => {
    const { user_id } = req.body;

    try {
        const user = await fetchUser(user_id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

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

router.post('/follow', async (req, res) => {
    try {
        const { to_user_id } = req.body;

        const userCookie = req.cookies[USER_COOKIE_KEY];
        const from_user_id = userCookie ? JSON.parse(userCookie).user_id : null;

        if (!from_user_id || !to_user_id) {
            console.error("Invalid user IDs");
            return res.status(400).json({ msg: 'Invalid user IDs' });
        }

        const existingFollowQuery = 'SELECT * FROM follow WHERE from_user_id = ? AND to_user_id = ?';
        const existingFollow = await queryAsync(existingFollowQuery, [from_user_id, to_user_id]);

        if (existingFollow.length > 0) {
            console.error("Already followed");
            return res.status(400).json({ msg: 'Already followed' });
        }

        const insertFollowQuery = 'INSERT INTO follow (from_user_id, to_user_id) VALUES (?, ?)';
        await queryAsync(insertFollowQuery, [from_user_id, to_user_id]);

        console.log("Followed successfully");
        return res.status(200).json({ msg: 'Followed successfully' });
    } catch (err) {
        console.error('Database error:', err.message);
        return res.status(500).send('Server error');
    }
});

module.exports = router;