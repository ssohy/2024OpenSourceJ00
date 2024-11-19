const express = require('express');
const router = express.Router();
const  client  = require('../db/db_connect'); // MySQL 클라이언트 사용

router.get('/', (req, res) => {
    const userCookie = req.cookies['USER'];
    const user = userCookie ? JSON.parse(userCookie) : null;

    if (user) {
        client.query("SELECT * FROM mandalart WHERE user_id = ?", [user.user_id], (err, mandalartResult) => {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
            } else {
                if (mandalartResult.length > 0) {
                    const mandalartId = mandalartResult[0].mandalart_id;
                    client.query("SELECT * FROM tedolist WHERE mandalart_id = ?", [mandalartId], (err, tedolistResult) => {
                        if (err) {
                            console.log(err);
                            res.status(500).send("Server error");
                        } else {
                            res.render('viewMandalart', {
                                mandalart: mandalartResult[0],
                                tedolists: tedolistResult
                            });
                        }
                    });
                } else {
                    res.redirect('/mandalart/create');
                }
            }
        });
    } else {
        res.redirect('/signin');
    }
});

router.get('/checklists/:mandalartId/:tedolistNumber', (req, res) => {
    const { mandalartId, tedolistNumber } = req.params;

    client.query("SELECT * FROM checklist WHERE mandalart_id = ? AND tedolist_number = ?", [mandalartId, tedolistNumber], (err, checklists) => {
        if (err) {
            console.log(err);
            res.status(500).send("Server error");
        } else {
            res.json(checklists);
        }
    });
});

module.exports = router;
