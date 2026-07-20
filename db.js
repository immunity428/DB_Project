const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: "localhost",
    user: "app",
    password: "0116",
    database: "lesson"
});

module.exports = db;
