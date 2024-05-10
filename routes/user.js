const express = require('express');
const jwt = require('jsonwebtoken');
const user = express.Router();
const db = require('../config/database');

// Register a user
user.post("/signin", async (req, res, next) => {
    const { user_name, full_name, password, status } = req.body;

    if (user_name && full_name && password && status) {
        let query = "INSERT INTO user (user_name, full_name, password, status) ";
        query += `VALUES ('${user_name}', '${full_name}', '${password}', '${status}');`;
        const rows = await db.query(query);
    
        if(rows.affectedRows == 1) {
            return res.status(201).json({ code: 201, message: "Usuario registrado correctamente" });
        }
        return res.status(500).json({code: 500, message: "Ocurrió un error"});
    }
    return res.status(500).json({code: 500, message: "Campos incompletos"});
});

// Login a user
user.post("/login", async (req, res, next) => {
    const { user_name, password } = req.body;
    const query = `SELECT * FROM user WHERE user_name = '${user_name}' AND password = '${password}';`;
    const rows = await db.query(query);
    console.log(rows);

    if (user_name && password) {
        if(rows.length == 1) {
            const token = jwt.sign({
                user_name: rows[0].user_name,
            }, "debugkey");
            return res.status(200).json({code: 200, message: token });
        }
        else {
            return res.status(200).json({code: 401, message: "Usuario y/o contraseña incorrectos"});
        }
    }
    return res.status(500).json({code: 500, message: "Campos incompletos"});
    
});

// Get a users
user.get("/", async (req, res, next) => {
    const query = "SELECT * FROM user";
    const rows = await db.query(query);

    return res.status(200).json({code: 200, message: rows});
});

module.exports = user;