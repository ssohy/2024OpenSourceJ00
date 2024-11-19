const client = require('./db_connect');

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

async function savePaymentInfo(userId, amount) {
    return new Promise((resolve, reject) => {
        client.query('INSERT INTO payments (user_id, amount) VALUES (?, ?)', [userId, amount], (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

async function changeColor(mandalart_id, center_color) {
    return new Promise((resolve, reject) => {
        client.query('UPDATE mandalart SET center_color = ? WHERE mandalart_id = ?', [center_color, mandalart_id], (err, results) => {
            if(err) {
                return reject(err);
            }
            resolve(results);
        } )
    })
}

module.exports = { fetchUser, savePaymentInfo, changeColor };