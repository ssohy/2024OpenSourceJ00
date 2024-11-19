const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');
const client  = require('../db/db_connect'); // MySQL 클라이언트 사용
const multer = require('multer');
const USER_COOKIE_KEY = 'USER';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads')); // 업로드 디렉토리 경로 확인
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const fileName = Date.now() + (ext === '.jpeg' ? '.jpg' : ext); 
        cb(null, fileName); // 표준화된 파일명 생성
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 파일 크기 제한 (10MB)
});

async function fetchUser(user_id) {
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM user WHERE user_id = ?', [user_id], (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results[0]);
        });
    });
}

async function createUser(newUser) {
    const hashedPassword = await bcrypt.hash(newUser.user_pw, 10);
    newUser.user_pw = hashedPassword;
    return new Promise((resolve, reject) => {
        client.query('INSERT INTO user SET ?', newUser, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

// 회원 탈퇴 라우트 추가
router.post('/delete', async (req, res) => {
    if (!req.cookies || !req.cookies[USER_COOKIE_KEY]) {
        return res.status(401).json({ msg: 'Unauthorized' });
    }

    const user = JSON.parse(req.cookies[USER_COOKIE_KEY]);
    const userId = user.user_id;

    try {
        client.query('DELETE FROM user WHERE user_id = ?', [userId], (err, result) => {
            if (err) {
                console.error('Error deleting user:', err);
                return res.status(500).send('Server error');
            }

            if (result.affectedRows > 0) {
                res.clearCookie(USER_COOKIE_KEY);
                return res.json({ msg: 'User deleted successfully' });
            } else {
                return res.status(404).json({ msg: 'User not found' });
            }
        });
    } catch (err) {
        console.error('Error during user deletion:', err);
        res.status(500).send('Server error');
    }
});

// 회원 가입 라우트
router.post('/signup', upload.single('user_image'), async (req, res) => {
    const { user_id, user_email, user_pw, user_birthday, user_nickname } = req.body;
    const user_image = req.file; // 업로드된 파일 정보

    // 업로드된 파일 정보 로그
    console.log('Uploaded file:', req.file);

    try {
        let user = await fetchUser(user_id);
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const newUser = {
            user_id,
            user_email,
            user_pw,
            user_birthday,
            user_nickname,
            user_image: user_image ? user_image.filename : null // 파일명이 데이터베이스에 저장됨
        };
        await createUser(newUser);

        const payload = { user: { user_id: newUser.user_id } };
        jwt.sign(payload, 'secret', { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.cookie(USER_COOKIE_KEY, JSON.stringify(payload.user));
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 로그인 라우트
router.post('/signin', async (req, res) => {
    const { user_id, user_pw } = req.body;

    try {
        let user = await fetchUser(user_id);
        if (!user) {
            return res.status(400).json({ msg: '사용자를 찾을 수 없습니다.' });
        }

        console.log('User found:', user);
        console.log('Comparing password:', user_pw, 'with hash:', user.user_pw);

        const isMatch = await bcrypt.compare(user_pw, user.user_pw);
        console.log('Password match result:', isMatch); // 디버깅 로그 추가
        if (!isMatch) {
            console.log('Password does not match');
            return res.status(400).json({ msg: '비밀번호 오류' });
        }

        const payload = { user: { user_id: user.user_id } };
        jwt.sign(payload, 'secret', { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.cookie(USER_COOKIE_KEY, JSON.stringify(payload.user));
            res.redirect('/'); // 로그인 성공 시 홈 페이지로 리디렉션
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 사용자 정보 확인 라우트
router.get('/', async (req, res) => {
    const userCookie = req.cookies[USER_COOKIE_KEY];

    if (userCookie) {
        const userData = JSON.parse(userCookie);
        const user = await fetchUser(userData.user_id);
        if (user) {
            res.status(200).send(`
                <a href="/logout">Log Out</a>
                <h1>id: ${user.user_id}, email: ${user.user_email}, birth: ${user.user_birthday}, nickname: ${user.user_nickname}</h1>
                <img src="/uploads/${user.user_image}" alt="Profile Image">
            `);
            return;
        }
    }

    res.status(200).send(`
        <a href="/signin.html">Sign In</a>
        <a href="/signup.html">Sign Up</a>
        <h1>Not Logged In</h1>
    `);
});

// 프로필 이미지 변경 라우트
router.post('/updateProfileImage', upload.single('user_image'), async (req, res) => {
    const user = req.cookies[USER_COOKIE_KEY] ? JSON.parse(req.cookies[USER_COOKIE_KEY]) : null;
    if (!user) {
        return res.status(401).json({ msg: 'Unauthorized' });
    }

    const user_id = user.user_id;
    const user_image = req.file;

    if (!user_image) {
        return res.status(400).json({ msg: 'No image uploaded' });
    }

    try {
        client.query('UPDATE user SET user_image = ? WHERE user_id = ?', [user_image.filename, user_id], (err, results) => {
            if (err) {
                console.error('Error updating profile image:', err);
                return res.status(500).json({ msg: 'Server error' });
            }

            res.redirect('/profile');
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 댓글을 가져오는 API 추가
router.get('/comments/:mandalartId', (req, res) => {
    const mandalartId = req.params.mandalartId;

    // 댓글과 사용자 정보를 함께 가져오는 쿼리
    const commentQuery = `
        SELECT c.*, u.user_image
        FROM comments c
        LEFT JOIN user u ON c.user_id = u.user_id
        WHERE mandalart_id = ?`;

    client.query(commentQuery, [mandalartId], (err, results) => {
        if (err) {
            console.error('Error fetching comments:', err);
            return res.status(500).json({ msg: 'Server error' });
        }
        res.json(results);
    });
});

module.exports = router;
