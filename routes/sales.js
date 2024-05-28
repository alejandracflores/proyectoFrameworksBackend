const express = require('express');
const jwt = require('jsonwebtoken');
const sales = express.Router();
const db = require('../config/database');
const { uploadFile } = require('../utils/uploadFile');
const multer = require('multer');
const user = require('./user');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


sales.post('/raise-scores', async (req, res, next) => {
    try {
        const token = req.headers['token'];
        // Verificar si el token no existe
        if (!token) {
            return res.status(401).json({code: 401, message: "Token no proporcionado"});
        }

        // Verificar si el token es válido
        let decoded;
        try {
            decoded = jwt.verify(token, "debugkey");
        } catch (error) {
            return res.status(401).json({code: 401, message: "Token inválido"});
        }

        // Obtener los datos
        const { id_work, score, artist_id } = req.body;
        const user_name = decoded.user_name;

        // Insertar valores en la tabla de calificaciones
        let query = `INSERT INTO scores VALUES (${id_work}, '${user_name}', ${score})`;
        let rows = await db.query(query);

        // Actualizar la calificación de la obra
        const likeQueryWorks = `SELECT COUNT(*) as likes FROM scores WHERE id_work = ${id_work} AND score = 1`;
        const dislikeQueryWorks = `SELECT COUNT(*) as dislikes FROM scores WHERE id_work = ${id_work} AND score = 0`;
        
        const [likeResultWorks] = await db.query(likeQueryWorks);
        const [dislikeResultWorks] = await db.query(dislikeQueryWorks);

        const likesWorks = likeResultWorks.likes;
        const dislikesWorks = dislikeResultWorks.dislikes;

        const updateQueryWorks = `UPDATE works SET score_like = ${likesWorks}, score_dislike = ${dislikesWorks} WHERE id_work = ${id_work}`;
        rows = await db.query(updateQueryWorks);

        // Actualizar la calificación del artista
        const likeQueryArtist = `SELECT SUM(score_like) as likes FROM works WHERE artist_id = '${artist_id}'`;
        const dislikeQueryArtist = `SELECT SUM(score_dislike) as dislikes FROM works WHERE artist_id = '${artist_id}'`;

        const [likeResultArtist] = await db.query(likeQueryArtist);
        const [dislikeResultArtist] = await db.query(dislikeQueryArtist);

        const likesArtist = likeResultArtist.likes;
        const dislikesArtist = dislikeResultArtist.dislikes;

        const updateQueryArtist = `UPDATE artist SET score_like = ${likesArtist}, score_dislike = ${dislikesArtist} WHERE user_name = '${artist_id}'`;
        rows = await db.query(updateQueryArtist);

        if (rows.affectedRows == 1) {
            return res.status(200).json({ code: 200, message: "Calificación subida correctamente" });
        } else {
            return res.status(500).json({ code: 500, message: "Ocurrió un error " });
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});

// sales.get('/', async (req, res, next) => {
//     const query = "SELECT * FROM sales";
//     const rows = await db.query(query);
//     return res.status(200).json({ code: 200, message: rows });
// });

module.exports = sales;