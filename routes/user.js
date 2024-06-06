const express = require('express');
const jwt = require('jsonwebtoken');
const user = express.Router();
const db = require('../config/database');
const { uploadFile } = require('../utils/uploadFile');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// Registrar usuario
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
        return res.status(400).json({code: 400, message: "Campos incompletos"});
    } catch (error) {
        return res.status(501).json({code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});


// Login a usuario
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
        return res.status(400).json({code: 400, message: "Campos incompletos"});
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});


// Editar o añadir la foto de perfil del comprador
user.put("/perfil-buyer", upload.single('perfil'), async (req, res, next) => {
    try {
        // Verificar si el token no existe
        const token = req.headers['token'];
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
        const { correo } = req.body;

        // Verificar si al menos un campo está presente
        if ((result != 'error' || correo)) {
            let updates = [];
            if (result !== 'error') updates.push(`photo = '${result}'`);
            if (correo) updates.push(`correo = '${correo}'`);

            // Constructor Update Dinámico para la tabla artist
            let query = `UPDATE buyer SET ${updates.join(', ')} WHERE user_name = '${user_name}';`;
            try {
                const rows = await db.query(query);

                if (rows.affectedRows == 1) {
                    // Si se actualizó la foto de perfil, regresar el mensaje de éxito
                    return res.status(200).json({ code: 200, message: "Perfil actualizado correctamente" });
                }
                return res.status(500).json({ code: 500, message: "Ocurrió un error al actualizar los datos de perfil" });
            } catch (error) {
                return res.status(500).json({ code: 500, message: "Ocurrió un error", error: error.message });
            }
        } else {
            return res.status(400).json({ code: 400, message: "No se proporcionó ningún campo para actualizar" });
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message });
    }
});


// Editar perfil del artista
user.put("/perfil-artist", upload.single('perfil'), async (req, res, next) => {
    try {
        // Verificar si el token no existe
        const token = req.headers['token'];
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
        const { social_media_instagram, social_media_x, social_media_tiktok, correo, social_media_otro, cuenta_paypal } = req.body;

        // Verificar si al menos un campo está presente
        if ((result != 'error' || social_media_instagram || social_media_x || social_media_tiktok || correo || social_media_otro || cuenta_paypal)) {
            let updates = [];
            if (result !== 'error') updates.push(`photo = '${result}'`);
            if (social_media_instagram) updates.push(`social_media_instagram = '${social_media_instagram}'`);
            if (social_media_x) updates.push(`social_media_x = '${social_media_x}'`);
            if (social_media_tiktok) updates.push(`social_media_tiktok = '${social_media_tiktok}'`);
            if (correo) updates.push(`correo = '${correo}'`);
            if (social_media_otro) updates.push(`social_media_otro = '${social_media_otro}'`);
            if (cuenta_paypal) updates.push(`cuenta_paypal = '${cuenta_paypal}'`);

            // Constructor Update Dinámico para la tabla artist
            let query = `UPDATE artist SET ${updates.join(', ')} WHERE user_name = '${user_name}';`;
            try {
                const rows = await db.query(query);

                if (rows.affectedRows == 1) {
                    // Si cuenta_paypal fue actualizado, actualizar también todas las publicaciones del usuario
                    if (cuenta_paypal) {
                        let updatePublicationsQuery = `UPDATE works SET payment = '${cuenta_paypal}' WHERE artist_id = '${user_name}';`;
                        const updatePublicationsResult = await db.query(updatePublicationsQuery);
                        
                        if (updatePublicationsResult.affectedRows >= 1) {
                            return res.status(200).json({ code: 200, message: "Perfil y publicaciones actualizadas correctamente" });
                        } else {
                            return res.status(500).json({ code: 500, message: "Perfil actualizado pero ocurrió un error al actualizar las publicaciones" });
                        }
                    } else {
                        return res.status(200).json({ code: 200, message: "Perfil actualizado correctamente" });
                    }
                }
                return res.status(500).json({ code: 500, message: "Ocurrió un error al actualizar los datos de perfil" });
            } catch (error) {
                return res.status(500).json({ code: 500, message: "Ocurrió un error", error: error.message });
            }
        } else {
            return res.status(400).json({ code: 400, message: "No se proporcionó ningún campo para actualizar" });
        }
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message });
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
            if (rows[0].photo == '') {
                // En caso de que no tenga foto de perfil
                rows[0].photo = null;
                return res.status(200).json({ code: 200, message: rows[0] });
            }
            else {
                // Agregar la URL base a la columna photo
                rows[0].photo = baseImageUrl + rows[0].photo;
                return res.status(200).json({ code: 200, message: rows[0] });
            }
        }

        query = `
        SELECT artist.*, user.full_name
        FROM artist
        INNER JOIN user ON artist.user_name = user.user_name
        WHERE artist.user_name = '${user_name}';
        `;
        rows = await db.query(query);
        if (rows.length === 1) {
            if (rows[0].photo == '') {
                // En caso de que no tenga foto de perfil
                rows[0].photo = null;
                return res.status(200).json({ code: 200, message: rows[0] });
            }
            else {
                // Agregar la URL base a la columna photo
                rows[0].photo = baseImageUrl + rows[0].photo;
                return res.status(200).json({ code: 200, message: rows[0] });
            }
        }

        return res.status(402).json({ code: 402, message: "Usuario no encontrado" });
    } catch (error) {
        return res.status(501).json({ code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});

// Cargar perfil de otro usuario
user.get("/perfil/:user_name", async (req, res, next) => {
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
        const user_name = req.params.user_name;
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
            if (rows[0].photo == '') {
                // En caso de que no tenga foto de perfil
                rows[0].photo = null;
                return res.status(200).json({ code: 200, message: rows[0] });
            }
            else {
                // Agregar la URL base a la columna photo
                rows[0].photo = baseImageUrl + rows[0].photo;
                return res.status(200).json({ code: 200, message: rows[0] });
            }
            
        }

        query = `
        SELECT artist.*, user.full_name
        FROM artist
        INNER JOIN user ON artist.user_name = user.user_name
        WHERE artist.user_name = '${user_name}';
        `;
        rows = await db.query(query);
        if (rows.length === 1) {
            if (rows[0].photo == '') {
                // En caso de que no tenga foto de perfil
                rows[0].photo = null;
                return res.status(200).json({ code: 200, message: rows[0] });
            }
            else {
                // Agregar la URL base a la columna photo
                rows[0].photo = baseImageUrl + rows[0].photo;
                return res.status(200).json({ code: 200, message: rows[0] });
            }
        }

        return res.status(402).json({ code: 402, message: "Usuario no encontrado" });
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