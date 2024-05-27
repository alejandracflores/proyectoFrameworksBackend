const express = require('express');
const jwt = require('jsonwebtoken');
const user = express.Router();
const db = require('../config/database');
const { uploadFile } = require('../utils/uploadFile');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// Register a user
user.post("/signin", async (req, res, next) => {
    try {
        const { user_name, full_name, password, status } = req.body;

        if (user_name && full_name && password && status) {
            let query = "INSERT INTO user (user_name, full_name, password, status) ";
            query += `VALUES ('${user_name}', '${full_name}', '${password}', '${status}');`;
            const rows = await db.query(query);
        
            if(rows.affectedRows == 1) {
                console.log(rows);
                // If para identificar status
                if (status == "Comprador") {
                    let query = `INSERT INTO buyer (user_name) VALUES ('${user_name}');`;
                    const rows = await db.query(query);
                }
                else {
                    let query = `INSERT INTO artist (user_name) VALUES ('${user_name}');`;
                    const rows = await db.query(query);
                }
                return res.status(201).json({ code: 201, message: "Usuario registrado correctamente" });
            }
            return res.status(500).json({code: 500, message: "Ocurrió un error"});
        }
        return res.status(500).json({code: 500, message: "Campos incompletos"});
    } catch (error) {
        return res.status(501).json({code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});


// Login a user
user.post("/login", async (req, res, next) => {
    try {
        const { user_name, password } = req.body;
        const query = `SELECT * FROM user WHERE user_name = '${user_name}' AND password = '${password}';`;
        const rows = await db.query(query);
        console.log(rows);

        if (user_name && password) {
            if(rows.length == 1) {
                const token = jwt.sign({
                    user_name: rows[0].user_name,
                    status: rows[0].status,

                }, "debugkey");
                return res.status(200).json({code: 200, message: token, user_name: rows[0].user_name, status: rows[0].status});
            }
            else {
                return res.status(200).json({code: 401, message: "Usuario y/o contraseña incorrectos"});
            }
        }
        return res.status(500).json({code: 500, message: "Campos incompletos"});
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});

// user.post ("/prueba-imagen", upload.single('perfil'), async (req, res, next) => {
//     // Imprimir datos del archivo
//     console.log(req.file);
//     // Imprime los datos del body (prueba)
//     console.log(req.body.prueba);
//     // Guarda el nombre de la imagen que se subió al bucket
//     const result = await uploadFile(req.file);
//     // Imprime el nombre de la imagen
//     console.log(result);
//     // Retorna el nombre de la imagen
//     return res.status(200).json({code: 200, message: "Imagen subida correctamente", filename: result});
// });


// Editar o añadir la foto de perfil del comprador
user.post("/perfil-buyer", upload.single('perfil'), async (req, res, next) => {
    try {
        // Verificar si el token no existe
        const token = req.headers['token'];
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
        // Obetener el user del comprador
        const user_name = decoded.user_name;

        // Imprimir datos del archivo
        console.log(req.file);
        // Imprime los datos del body (prueba)
        console.log(req.body.prueba);
        // Guarda el nombre de la imagen que se subió al bucket
        

        try {
            const result = await uploadFile(req.file);
            
            // Imprime el nombre de la imagen
            console.log(result);

            // Verificar si los campos necesarios existen
            if (result != 'error') {
                let query = `UPDATE buyer SET photo = '${result}' WHERE user_name = '${user_name}';`;
                try {
                    const rows = await db.query(query);

                    if(rows.affectedRows == 1) {
                        return res.status(200).json({ code: 200, message: "Foto de perfil actualizada correctamente" });
                    }
                    return res.status(500).json({code: 500, message: "Ocurrió un error al actualizar la foto de perfil"});
                } catch (error) {
                    return res.status(500).json({code: 500, message: "Ocurrió un error", error: error.message});
                }
            }
        } catch (error) {
            return res.status(400).json({code: 400, message: "Campos incompletos"});
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});


// Editar perfil del vendedor
user.post("/perfil-artist", upload.single('perfil'), async (req, res, next) => {
    try {
        // Verificar si el token no existe
        const token = req.headers['token'];
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

        // Obtener el user del artista
        const user_name = decoded.user_name;

        // Imprimir datos del archivo
        console.log(req.file);
        let result = 'error';
        if (req.file) {
            // Guarda el nombre de la imagen que se subió al bucket
            result = await uploadFile(req.file);
            // Imprime el nombre de la imagen
            console.log(result);
        }

        // Extraer los campos de la solicitud
        const { social_media_instagram, social_media_x, social_media_tiktok, correo, social_media_otro } = req.body;

        // Verificar si al menos un campo está presente
        if ((result != 'error') || social_media_instagram || social_media_x || social_media_tiktok || correo || social_media_otro) {
            let updates = [];
            if (result != 'error') updates.push(`photo = '${result}'`);
            if (social_media_instagram) updates.push(`social_media_instagram = '${social_media_instagram}'`);
            if (social_media_x) updates.push(`social_media_x = '${social_media_x}'`);
            if (social_media_tiktok) updates.push(`social_media_tiktok = '${social_media_tiktok}'`);
            if (correo) updates.push(`correo = '${correo}'`);
            if (social_media_otro) updates.push(`social_media_otro = '${social_media_otro}'`);

            // Constructor Update Dinámico
            let query = `UPDATE artist SET ${updates.join(', ')} WHERE user_name = '${user_name}';`;
            try {
                const rows = await db.query(query);

                if (rows.affectedRows == 1) {
                    return res.status(200).json({ code: 200, message: "Datos de perfil actualizados correctamente" });
                }
                return res.status(500).json({code: 500, message: "Ocurrió un error al actualizar los datos de perfil"});
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

// Mostrar información del usuario
user.get("/perfil", async (req, res, next) => {
    try {
        // Verificar si el token no existe
        const token = req.headers['token'];
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

        // Obtener el user del comprador
        const user_name = decoded.user_name;
         // URL base para las imágenes
         const baseImageUrl = "https://bucketdealesitacomunarte.s3.amazonaws.com/";

        // Verificar si el usuario es un comprador o un vendedor
        let query = `
        SELECT buyer.*, user.full_name
        FROM buyer
        INNER JOIN user ON buyer.user_name = user.user_name
        WHERE buyer.user_name = '${user_name}';
        `;
        let rows = await db.query(query);
        if (rows.length === 1) {
            // Agregar la URL base a la columna photo
            rows[0].photo = baseImageUrl + rows[0].photo;
            return res.status(200).json({ code: 200, message: rows[0] });
        }

        query = `
        SELECT artist.*, user.full_name
        FROM artist
        INNER JOIN user ON artist.user_name = user.user_name
        WHERE artist.user_name = '${user_name}';
        `;
        rows = await db.query(query);
        if (rows.length === 1) {
            // Agregar la URL base a la columna photo
            rows[0].photo = baseImageUrl + rows[0].photo;
            return res.status(200).json({ code: 200, message: rows[0] });
        }

        return res.status(404).json({ code: 404, message: "Usuario no encontrado" });
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});



// Get a users
// user.get("/", async (req, res, next) => {
//     const query = "SELECT * FROM user";
//     const rows = await db.query(query);

//     return res.status(200).json({code: 200, message: rows});
// });

module.exports = user;