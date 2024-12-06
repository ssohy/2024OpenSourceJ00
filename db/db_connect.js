require('dotenv').config();

const mysql = require('mysql2/promise');

const dbInfo = {
    host: process.env.dbHost,
    user: process.env.dbUser,
    password: process.env.dbPassword,
    port: process.env.dbPort,
    database: process.env.dbName
};

// DB 연결 풀 생성
const client = mysql.createPool(dbInfo);

// DB 연결 테스트
async function testConnection() {
    try {
        const connection = await client.getConnection();
        console.log("DB 연결 성공:", dbInfo.host);
        connection.release();  // 연결을 반환하여 풀에서 재사용되도록 합니다.
    } catch (error) {
        console.error("DB 연결 실패:", error.message);
    }
}

// 연결 테스트 실행
testConnection();

module.exports = {
    client
};
