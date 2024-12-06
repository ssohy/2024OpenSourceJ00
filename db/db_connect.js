require('dotenv').config();
const mysql = require('mysql');

// MySQL 클라이언트 설정
const client = mysql.createConnection({
    host: process.env.dbHost,
    user: process.env.dbUser,
    password: process.env.dbPassword,
    port: process.env.dbPort,
    database: process.env.dbName
});

client.connect();
module.exports = client;
