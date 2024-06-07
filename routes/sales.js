const express = require("express");
const jwt = require("jsonwebtoken");
const sales = express.Router();
const db = require("../config/database");
const axios = require("axios");
const { sendEmail, formatEmailSeller, formatEmailBuyer } = require("../utils/sendEmail");


// Subir calificaciones de obras
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
        const { id_work, score, artist_id, id_purchase } = req.body;
        const user_name = decoded.user_name;

        // Insertar valores en la tabla de calificaciones
        let query = `INSERT INTO scores VALUES (${id_work}, '${user_name}', '${id_purchase}', ${score})`;
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

// Realizar compra
sales.post("/purchase", async (req, res, next) => {
  try {
    const token = req.headers["token"];
    if (!token) {
      return res
        .status(401)
        .json({ code: 401, message: "Token no proporcionado" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, "debugkey");
    } catch (error) {
      return res.status(401).json({ code: 401, message: "Token inválido" });
    }

    const { purchases, total_ammount } = req.body;

    const user_name = decoded.user_name;

    let correoBuyer = null;

    console.log(decoded.status);

    // Verificar el tipo de usuario
    if (decoded.status === "Vendedor") {
      // Verificar si el correo no está nulo
      let correoQuery = `SELECT correo FROM artist WHERE user_name = '${user_name}'`;
      correoBuyer = await db.query(correoQuery);
      if (correoBuyer.length === 0 || !correoBuyer[0].correo) {
        return res.status(400).json({
          code: 400,
          message: "No se puede comprar una obra sin un correo electrónico",
        });
      }
    } else {
      // Verificar si el correo no está nulo
      let correoQuery = `SELECT correo FROM buyer WHERE user_name = '${user_name}'`;
      correoBuyer = await db.query(correoQuery);
      if (correoBuyer.length === 0 || !correoBuyer[0].correo) {
        return res.status(400).json({
          code: 400,
          message: "No se puede comprar una obra sin un correo electrónico",
        });
      }
    }

    const correo = correoBuyer[0].correo;

    // Pago por artista
    let artistPayments = {};

    // Insertar en purchases una sola vez por compra
    let query = `INSERT INTO purchases (user_name, total_ammount) VALUES ('${user_name}', ${total_ammount})`;
    let rows = await db.query(query);
    let id_purchase = rows.insertId;

    for (const purchase of purchases) {
      const { id_work, quantity, total } = purchase;

      // Obtener datos de la obra incluyendo el método de pago y el artista
      query = `SELECT w.artist_id, w.payment, w.title, w.price, a.correo, u.full_name FROM works w, artist a, user u WHERE w.id_work = ${id_work} AND w.artist_id = a.user_name AND a.user_name = u.user_name`;
      let [work] = await db.query(query);

      if (!work) {
        return res
          .status(404)
          .json({ code: 404, message: `Obra con id ${id_work} no encontrada` });
      }

      // Actualizar el stock de la obra
      query = `UPDATE works SET stock = stock - ${quantity} WHERE id_work = ${id_work}`;
      await db.query(query);

      // Insertar en purchases_works por cada artículo
      query = `INSERT INTO purchases_works (id_purchase, id_work, quantity, total) VALUES (${id_purchase}, ${id_work}, '${quantity}', ${total})`;
      await db.query(query);

      // Agrupar por artista y sumar los totales
      if (!artistPayments[work.artist_id]) {
        artistPayments[work.artist_id] = {
          amount: total,
          sellerEmail: work.payment,
          personalEmail: work.correo,
          name: work.full_name,
          titles: [],
        };
      }
      artistPayments[work.artist_id].amount += total;
      artistPayments[work.artist_id].titles.push({
        product: work.title,
        quantity: quantity,
        unitPrice: work.price,
      });
    }

    // Convertir el objeto de pagos por artista en un arreglo
    const paypalPayments = Object.values(artistPayments);

    // console.log(paypalPayments);

    // Llamar a la función de PayPal
    const response = await axios.post(
      "https://proyectoframeworksbackend-production.up.railway.app/paypal/create",
      { payments: paypalPayments }
    );
    const paypalResponses = response.data;

    console.log(paypalPayments);

    // Crear y enviar correos a los vendedores
    for (const payment of paypalPayments) {
      const emailData = {
        amount: payment.amount,
        sellerName: payment.name,
        buyerName: user_name,
        buyerEmail: correo,
        titles: payment.titles,
      };

      const sellerEmailBody = formatEmailSeller(emailData);

      const sellerData = {
        destination: payment.personalEmail,
        // destination: "costas.rueda.juan.pablo@gmail.com",
        subject: `Compra de Comunarte de $${payment.amount}`,
        html: sellerEmailBody,
      };

      sendEmail(sellerData);
    }

    // Crear y enviar correo al comprador
    const buyerEmailData = {
      total_ammount: total_ammount,
      buyerName: user_name,
      buyerEmail: correo,
      payments: paypalPayments,
    };

    const buyerEmailBody = formatEmailBuyer(buyerEmailData)

    const buyerData = {
        destination: correo,
        // destination: "costas.rueda.juan.pablo@gmail.com",
        subject: `Recibo de compra Comunarte`,
        html: buyerEmailBody,
      };

    sendEmail(buyerData)

    res.status(200).json({ code: 200, message: paypalResponses });
  } catch (error) {
    console.log(error);
    return res.status(501).json({
      code: 501,
      message: "Ocurrió un error (servidor)",
      error: error.message,
    });
  }
});

// Mostrar historial de compras
sales.get("/history-purchases", async (req, res, next) => {
  try {
    const token = req.headers["token"];
    // Verificar si el token no existe
    if (!token) {
      return res
        .status(401)
        .json({ code: 401, message: "Token no proporcionado" });
    }

    // Verificar si el token es válido
    let decoded;
    try {
      decoded = jwt.verify(token, "debugkey");
    } catch (error) {
      return res.status(401).json({ code: 401, message: "Token inválido" });
    }

    const user_name = decoded.user_name;

    const query = `
            SELECT p.id_purchase, pw.id_work, pw.quantity, pw.total, w.title, w.images, w.artist_id, w.description
            FROM purchases p
            JOIN purchases_works pw ON p.id_purchase = pw.id_purchase
            JOIN works w ON pw.id_work = w.id_work
            WHERE p.user_name = '${user_name}'
        `;

    try {
      const rows = await db.query(query);

      // URL base para las imágenes
      const baseImageUrl = "https://bucketdealesitacomunarte.s3.amazonaws.com/";

      // Procesar las filas para incluir la URL completa de la imagen principal
      const processedRows = rows.map((row) => {
        const imageUrls = row.images.split(",");
        const mainImageUrl = `${baseImageUrl}${imageUrls[0]}`;
        return {
          id_purchase: row.id_purchase,
          id_work: row.id_work,
          quantity: row.quantity,
          total: row.total,
          title: row.title,
          artist: row.artist_id,
          description: row.description,
          mainImageUrl: mainImageUrl,
        };
      });
      return res.status(200).json({ code: 200, message: processedRows });
    } catch (error) {
      return res
        .status(500)
        .json({ code: 500, message: "Ocurrió un error", error: error.message });
    }
  } catch (error) {
    return res.status(501).json({
      code: 501,
      message: "Ocurrió un error (servidor)",
      error: error.message,
    });
  }
});

// sales.get('/', async (req, res, next) => {
//     const query = "SELECT * FROM sales";
//     const rows = await db.query(query);
//     return res.status(200).json({ code: 200, message: rows });
// });

module.exports = sales;
