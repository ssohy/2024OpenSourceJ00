require('dotenv').config();

const mysql = require('mysql2/promise');

const dbInfo = {
    host: process.env.dbHost,
    user: process.env.dbUser,
    password: process.env.dbPassword,
    port: process.env.dbPort,
    database: process.env.dbName
}

const client = mysql.createPool(dbInfo)

module.exports = {
    client
};
