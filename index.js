const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const usersRouter = require('./routes/users');
const shareRouter = require('./routes/share');
const addFriendRouter = require('./routes/add_friend');
const mandalartRouter = require('./routes/mandalart'); // Import mandalart routes
const client = require('./db/db_connect.js');
const { fetchUser, savePaymentInfo} = require('./db/db');
const schedule = require('node-schedule');
const commentRouter = require('./routes/comment');
const calendarRouter = require('./routes/calendar'); // 추가
const { timeLog } = require('console');
const { title } = require('process');
const paymentRouter = require('./routes/payment'); // 추가
const successRouter = require('./routes/success'); // 추가

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cors = require('cors');
app.use(cors());

// 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser 미들웨어
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// 정적 파일 미들웨어
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // 프로필 관련

// 전역적으로 `user` 변수를 설정하는 미들웨어 추가
app.use((req, res, next) => {
    const userCookie = req.cookies ? req.cookies['USER'] : null;
    res.locals.user = userCookie ? JSON.parse(userCookie) : null;
    next();
});

// 라우트 설정
app.use('/api/users', usersRouter);
app.use('/api/share', shareRouter);
app.use('/api/add_friend', addFriendRouter);
app.use('/mandalart', mandalartRouter); // Use mandalart routes
app.use('/comment', commentRouter);
app.use('/calendar', calendarRouter);
app.use('/payment', paymentRouter);
app.use('/success', successRouter);

// 뷰 라우트 설정
app.get('/signup', (req, res) => {
    res.render('signup', { title: 'Sign Up' });
});

app.get('/signin', (req, res) => {
    res.render('signin', { title: 'Sign In' });
});

app.get('/share', (req, res) => {
    if (!res.locals.user) {
        return res.redirect('/signin');
    }
    res.render('share', { title: 'Share' });
});

app.get('/add_friend', (req, res) => {
    if (!res.locals.user) {
        return res.redirect('/signin');
    }
    res.render('add_friend', { title: 'Add Friend' });
});

app.get('/', (req, res) => {
    res.render('home', { title: 'Home' });
});

app.get('/profile', (req, res) => {
    if (res.locals.user) {
        console.log('client',client);
        client.query('SELECT * FROM user WHERE user_id = ?', [res.locals.user.user_id], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            const userProfile = results[0];
            if (userProfile) {
                const birthday = new Date(userProfile.user_birthday);
                userProfile.user_birthday = `${birthday.getFullYear()}-${String(birthday.getMonth() + 1).padStart(2, '0')}-${String(birthday.getDate()).padStart(2, '0')}`;
            }
            res.render('profile', { title: 'Profile', user: userProfile });
        });
    } else {
        res.redirect('/signin');
    }
});

app.get('/share_viewMandalart', (req, res) => {
    if (!res.locals.user) {
        return res.redirect('/signin');
    }
    res.render('share_viewMandalart', { title: 'Share' });
});

//멤버쉽-설명창 라우트
app.get('/membership', (req, res) => {
    res.render('membership', {title : 'explain-membership'}); 
});

//결체창 여기서 해열 (결제창 렌더링. 사용자 로긘 확인 후 정보 넘겨)
app.get('/payment', async (req, res) => {
    if (res.locals.user) {
        try {
            //user 확인ㄱㄱ
            const user = await fetchUser(res.locals.user.user_id);
            console.log('User found:', user);
            res.render('payment', { title: 'payment', user });
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    } else {
        res.redirect('/signin');
    }
});

app.post('/payment', async(req, res) => {
    if(res.locals.users) {
        const userId = res.locals.users.user_id;
        const { amount } = res.body; //결제금액.. 가튼 결제 관련 정보
        try {
            await savePaymentInfo(userId, amount); //결제 관련 정보를 데베에 저장 근데 토스로직을 잘 몰라서 일단 이렇게 둠
            res.json({success : true});
        } catch(err) {
            console.log(err);
            res.status(500).json({ success : false, error:'결제 중 오류오류오류'});
        }
    } else {
        res.status(401).json({ success : false, error : '로그인하세영'});
    }

});

app.get('/success', (req, res) => {
    res.render('success', {title : 'membership-success'}); 
});

app.get('/fail', (req, res) => {
    res.render('fail', {title : 'membership-fail'}); 
});

// 자정마다 어제의 체크리스트를 오늘로 복사하는 작업 스케줄링
schedule.scheduleJob('0 0 * * *', async () => {
    try {
        // 어제 날짜를 'YYYY-MM-DD' 형식으로 가져옴
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate());
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // 오늘 날짜를 'YYYY-MM-DD' 형식으로 가져옴
        const today = new Date();
        today.setDate(today.getDate()+1);
        const todayStr = today.toISOString().split('T')[0];

        console.log(`Fetching checklists for date: ${yesterdayStr}`);
        
        // 어제 날짜의 체크리스트 가져오기
        client.query("SELECT * FROM checklist WHERE DATE(date) = ?", [yesterdayStr], (err, result) => {
            if (err) {
                console.log('Error fetching checklist:', err);
            } else {
                console.log(`Found ${result.length} checklists for date: ${yesterdayStr}`);
                
                if (result.length === 0) {
                    console.log('No checklist entries found for yesterday.');
                    return;
                }

                const newChecklistEntries = result.map(entry => [
                    entry.mandalart_id,
                    entry.tedolist_number,
                    entry.checklist_detail,
                    "", // imogi 초기화
                    todayStr, // 오늘 날짜
                    false // is_checked 초기화
                ]);

                // 새로운 체크리스트 삽입
                client.query(
                    "INSERT INTO checklist (mandalart_id, tedolist_number, checklist_detail, imogi, date, is_checked) VALUES ?",
                    [newChecklistEntries],
                    (insertErr, insertResult) => {
                        if (insertErr) {
                            console.log('Error inserting new checklist entries:', insertErr);
                        } else {
                            console.log('Successfully inserted new checklist entries for today:', insertResult.affectedRows);
                        }
                    }
                );
            }
        });
    } catch (error) {
        console.log('Error during scheduled task:', error);
    }
});

// 로그아웃 라우트
app.post('/logout', (req, res) => {
    res.clearCookie('USER');
    res.redirect('/signin');
});

// 서버 시작
const PORT = process.env.PORT || 5006;
app.listen(PORT, () => console.log(`Server running on  http://localhost:${PORT}`));
