const express = require('express');
const jwt = require('jsonwebtoken');
const publications = express.Router();
const db = require('../config/database');
const { uploadFile } = require('../utils/uploadFile');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// URL: https://bucketdealesitacomunarte.s3.amazonaws.com/

// Agregar publicación
publications.post("/add-publication", upload.array('images', 10), async (req, res, next) => {
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

        // Verificar si el usuario es un artista
        if (decoded.status !== 'Vendedor') {
            return res.status(403).json({code: 403, message: "No tienes permisos para agregar publicaciones"});
        }

        // Subir las imágenes al bucket
        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                let uploadResult = await uploadFile(file);
                if (uploadResult !== 'error') {
                    imagePaths.push(uploadResult);
                }
            }
        }

        // Variable de los campos
        const { title, description, status, price, payment, labels, stock } = req.body;
        // Obtener el id del artista
        const artist_id = decoded.user_name;

        // Verificar si los campos necesarios existen
        if (title && imagePaths.length > 0 && description && status && price && payment && labels && stock) {
            // Convertir los labels a una cadena separada por comas
            const labelsFinal = Array.isArray(labels) ? labels.join(',') : labels;
            // Convertir las imágenes a una cadena separada por comas
            const imagesFinal = imagePaths.join(',');

            // Insertar la publicación
            let query = "INSERT INTO works (artist_id, title, images, description, status, price, payment, labels, stock) ";
            query += `VALUES ('${artist_id}', '${title}', '${imagesFinal}', '${description}', '${status}', '${price}', '${payment}', '${labelsFinal}', '${stock}');`;

            // Ejecutar la consulta
            try {
                const result = await db.query(query);
                const newWorkId = result.insertId;

                // Actualizar la columna id_works en la tabla artist
                let updateQuery = `UPDATE artist SET works = CONCAT(IFNULL(works, ''), 
                                    IF(works IS NOT NULL AND works != '', ',', ''), 
                                    '${newWorkId}') WHERE user_name = '${artist_id}';`;
                const updateResult = await db.query(updateQuery);

                // Verificar si la publicación se añadió correctamente
                if(updateResult.affectedRows == 1) {
                    return res.status(201).json({ code: 201, message: "Publicación añadida y id_works actualizado correctamente" });
                }
                // En caso de que no se haya actualizado la columna id_works
                return res.status(500).json({code: 500, message: "Publicación añadida pero fallo al actualizar id_works"});
            } 
            // En caso de error
            catch (error) {
                return res.status(500).json({code: 500, message: "Ocurrió un error al añadir la publicación", error: error.message});
            }
        } 
        // En caso de campos incompletos
        else {
            return res.status(400).json({code: 400, message: "Campos incompletos"});
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});

// Editar publicación
publications.post("/edit-publication/:id", upload.array('images', 10), async (req, res, next) => {
    try {
        const token = req.headers['token'];
        const id_work = parseInt(req.params.id, 10);
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

        // Verificar si el usuario es un artista
        if (decoded.status !== 'Vendedor') {
            return res.status(403).json({code: 403, message: "No tienes permisos para actualizar publicaciones"});
        }

        // Subir las imágenes al bucket
        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                let uploadResult = await uploadFile(file);
                if (uploadResult !== 'error') {
                    imagePaths.push(uploadResult);
                }
            }
        }

        // Variable de los campos
        const { title, description, status, price, payment, labels, stock } = req.body;

        // Verificar si los campos necesarios existen
        if (title || imagePaths.length > 0 || description || status || price || payment || labels || stock) {
            // Convertir los labels a una cadena separada por comas
            const labelsFinal = Array.isArray(labels) ? labels.join(',') : labels;
            // Convertir las imágenes a una cadena separada por comas
            const imagesFinal = imagePaths.join(',');

            let updates = [];
            if (title) updates.push(`title = '${title}'`);
            if (imagePaths.length > 0) updates.push(`images = '${imagesFinal}'`);
            if (description) updates.push(`description = '${description}'`);
            if (status) updates.push(`status = '${status}'`);
            if (price) updates.push(`price = '${price}'`);
            if (payment) updates.push(`payment = '${payment}'`);
            if (labels) updates.push(`labels = '${labelsFinal}'`);
            if (stock) updates.push(`stock = '${stock}'`);

            // Insertar la publicación
            let query = `UPDATE works SET ${updates.join(', ')} WHERE id_work = '${id_work}';`;

            // Ejecutar la consulta
            try {
                const rows = await db.query(query);

                if (rows.affectedRows == 1) {
                    return res.status(200).json({ code: 200, message: "Publicación actualizada correctamente" });
                }
                return res.status(500).json({code: 500, message: "Ocurrió un error al actualizar la publicación"});
            } catch (error) {
                return res.status(500).json({code: 500, message: "Ocurrió un error", error: error.message});
            }
        } else {
            return res.status(400).json({code: 400, message: "No se proporcionó ningún campo para actualizar"});
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});


// Eliminar publicación
publications.delete("/delete-publication/:id", async (req, res, next) => {
    try {
        const token = req.headers['token'];
        const id_work = parseInt(req.params.id, 10);

        // Verificar si el token no existe
        if (!token) {
            return res.status(401).json({ code: 401, message: "Token no proporcionado" });
        }

        // Verificar si el token es válido
        let decoded;
        try {
            decoded = jwt.verify(token, "debugkey");
        } catch (error) {
            return res.status(401).json({ code: 401, message: "Token inválido" });
        }

        // Verificar si el usuario es un artista
        if (decoded.status !== 'Vendedor') {
            return res.status(403).json({ code: 403, message: "No tienes permisos para eliminar publicaciones" });
        }

        // Obtener el id del artista
        const artist_id = decoded.user_name;

        // Verificar si la publicación existe y pertenece al artista
        let query = `SELECT * FROM works WHERE id_work = ${id_work} AND artist_id = '${artist_id}'`;
        try {
            const rows = await db.query(query);
            if (rows.length === 0) {
                return res.status(404).json({ code: 404, message: "Publicación no encontrada o no tienes permiso para eliminarla" });
            }
        } catch (error) {
            return res.status(500).json({ code: 500, message: "Error al verificar la publicación", error: error.message });
        }

        // Eliminar la publicación
        query = `DELETE FROM works WHERE id_work = ${id_work} AND artist_id = '${artist_id}'`;
        try {
            const result = await db.query(query);
            if (result.affectedRows === 1) {
                // Actualizar la columna works en la tabla artist
                let updateQuery = `UPDATE artist SET works = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', works, ','), CONCAT(',', ${id_work}, ','), ',')) WHERE user_name = '${artist_id}'`;
                await db.query(updateQuery, [id_work, artist_id]);

                return res.status(200).json({ code: 200, message: "Publicación eliminada correctamente" });
            } else {
                return res.status(500).json({ code: 500, message: "Ocurrió un error al eliminar la publicación" });
            }
        } catch (error) {
            return res.status(500).json({ code: 500, message: "Ocurrió un error al eliminar la publicación", error: error.message });
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});

// Mostrar publicaciones en la página principal
publications.get("/publications-home", async (req, res, next) => {
    try {
        // Verificar si el token no existe
        const token = req.headers['token'];
        if (!token) {
            return res.status(401).json({ code: 401, message: "Token no proporcionado" });
        }

        // Verificar si el token es válido
        try {
            jwt.verify(token, "debugkey");
        } catch (error) {
            return res.status(401).json({ code: 401, message: "Token inválido" });
        }

        const query = "SELECT * FROM works ORDER BY RAND()";
        try {
            const rows = await db.query(query);
            
            // URL base para las imágenes
            const baseImageUrl = "https://bucketdealesitacomunarte.s3.amazonaws.com/";

            // Procesar las filas para incluir la URL completa de la imagen principal
            const processedRows = rows.map(row => {
                const imageUrls = row.images.split(",");
                const mainImageUrl = `${baseImageUrl}${imageUrls[0]}`;
                console.log(mainImageUrl);
                return {
                    ...row,
                    mainImageUrl
                };
            });

            return res.status(200).json({ code: 200, message: processedRows });
        } catch (error) {
            return res.status(500).json({ code: 500, message: "Ocurrió un error", error: error.message });
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});

// Mostrar publicaciones de un artista
publications.get("/publications-artist/:artist_id", async (req, res, next) => {
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

        // Verificar si el usuario es un artista
        if (decoded.status !== 'Vendedor') {
            return res.status(403).json({code: 403, message: "No tienes permisos para ver tus publicaciones"});
        }

        const artist_id = req.params.artist_id;

        const query = `SELECT * FROM works WHERE artist_id = '${artist_id}'`;
        try {
            const rows = await db.query(query);

            // URL base para las imágenes
            const baseImageUrl = "https://bucketdealesitacomunarte.s3.amazonaws.com/";

            // Procesar las filas para incluir la URL completa de la imagen principal
            const processedRows = rows.map(row => {
                const imageUrls = row.images.split(",");
                const mainImageUrl = `${baseImageUrl}${imageUrls[0]}`;
                return {
                    ...row,
                    mainImageUrl
                };
            });

            return res.status(200).json({ code: 200, message: processedRows });
        } catch (error) {
            return res.status(500).json({ code: 500, message: "Ocurrió un error", error: error.message });
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});


// Buscar publicaciones por etiquetas
publications.get("/search/:labels", async (req, res, next) => {
    try {
        // Verificar si el token no existe
        const token = req.headers['token'];
        if (!token) {
            return res.status(401).json({code: 401, message: "Token no proporcionado"});
        }

        // Verificar si el token es válido
        try {
            jwt.verify(token, "debugkey");
        } catch (error) {
            return res.status(401).json({code: 401, message: "Token inválido"});
        }

        const labels = req.params.labels.split(',');
        const query = `SELECT * FROM works WHERE labels REGEXP '${labels.join('|')}'`;

        try {
            const rows = await db.query(query);

            // URL base para las imágenes
            const baseImageUrl = "https://bucketdealesitacomunarte.s3.amazonaws.com/";

            // Procesar las filas para incluir la URL completa de la imagen principal
            const processedRows = rows.map(row => {
                const imageUrls = row.images.split(",");
                const mainImageUrl = `${baseImageUrl}${imageUrls[0]}`;
                return {
                    ...row,
                    mainImageUrl
                };
            });

            return res.status(200).json({ code: 200, message: rows });
        } catch (error) {
            return res.status(500).json({ code: 500, message: "Ocurrió un error", error: error.message });
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});


module.exports = publications;


