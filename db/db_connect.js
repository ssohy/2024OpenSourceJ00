const mysql = require('mysql2/promise');
require('dotenv').config();

const dbInfo = {
    host: process.env.dbHost,
    user: process.env.dbUser,
    password: process.env.dbPassword,
    port: process.env.dbPort,
    database: process.env.dbName
};

async function connectDB() {
    try {
        const connection = await mysql.createPool(dbInfo);
        console.log("DB 연결 성공");
        return connection;
    } catch (error) {
        console.error("DB 연결 실패:", error.message);
        throw error;
    }
}

module.exports = {
    connectDB
};
