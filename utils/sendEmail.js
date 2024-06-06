require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE,
  host: process.env.MAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendEmail(data) {
  try {
    const mailOptions = {
      from: "comunarteapi@gmail.com",
      to: data.destination,
      subject: data.subject,
      html: data.html,
      //   text: data.text,
    };

    const response = await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          reject("error");
        } else {
          resolve("success");
        }
      });
    });

    console.log(response);
  } catch (error) {
    console.log(error);
    return "error";
  }
}



function formatEmailSeller(data) {

  const receipt = `
            ${data.titles
              .map(
                (title) => `
                <tr>
                    <td style="border: 1px solid black; padding: 8px;">${title.quantity.toString()}</td>
                    <td style="border: 1px solid black; padding: 8px;">${title.product}</td>
                    <td style="border: 1px solid black; padding: 8px;">${title.unitPrice.toFixed(2)}</td>
                    <td style="border: 1px solid black; padding: 8px;">${(title.unitPrice * title.quantity).toFixed(2)}</td>
                </tr>
            `
              )
              .join("")}
        `;

  const email = `
                    <h2>Recibo de Pago</h2>
                    <p>Hola ${data.sellerName},</p>
                    <p>${data.buyerName} (${data.buyerEmail}) te ha hecho una compra(s):</p>
                    <div style="width:70%;">
                    <table style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid black; padding: 8px;">Cantidad</th>
                                <th style="border: 1px solid black; padding: 8px;">Producto</th>
                                <th style="border: 1px solid black; padding: 8px;">Precio Unitario</th>
                                <th style="border: 1px solid black; padding: 8px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${receipt}
                        </tbody>
                    </table>
                    <p style="text-align: right; font-weight: bold;">Total de la compra: ${data.amount.toFixed(2)}</p>
                    </div>
                    <p>Para cualquier consulta o aclaración, por favor comuníquese con nuestro departamento de atención al cliente.</p>
                    <p><strong>Comunarte</strong> es una empresa privada. Este recibo es solo para fines informativos y no constituye un contrato legal. No se acepta responsabilidad por errores u omisiones. Por favor, conserve este recibo para sus registros.</p>
                    <p>Si tiene alguna pregunta adicional, no dude en contactarnos. Agradecemos su preferencia.</p>
                    <p>Atentamente,</p>
                    <p><strong>Comunarte</strong></p>
                `

  return email

}

function formatReceiptBuyer(payments) {
    payments.forEach(element => {
        
    });
}

function buildReceipt(titles) {
    const receipt = `
    ${titles
        .map(
          (title) => `
          <tr>
              <td style="border: 1px solid black; padding: 8px;">${title.quantity.toString()}</td>
              <td style="border: 1px solid black; padding: 8px;">${title.product}</td>
              <td style="border: 1px solid black; padding: 8px;">${title.unitPrice.toFixed(2)}</td>
              <td style="border: 1px solid black; padding: 8px;">${(title.unitPrice * title.quantity).toFixed(2)}</td>
          </tr>
      `
        )
        .join("")}
    `
    return receipt
}

function formatEmailBuyer(data) {

    const sellers = `
    ${data.payments.map((payment) => `
    <p>Compra de ${payment.name} (${payment.personalEmail}):</p>
    <div style="width:70%;">
    <table style="width:100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th style="border: 1px solid black; padding: 8px;">Cantidad</th>
                <th style="border: 1px solid black; padding: 8px;">Producto</th>
                <th style="border: 1px solid black; padding: 8px;">Precio Unitario</th>
                <th style="border: 1px solid black; padding: 8px;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${buildReceipt(payment.titles)}
        </tbody>
    </table>
    <p style="text-align: right; font-weight: bold;">Total de la compra: ${payment.amount.toFixed(2)}</p>
    </div>
    `).join("")}
    `


    const email = `
    <h2>Recibo de Compra</h2>
    <p>Hola ${data.buyerName},</p>
    <p>Has realizado una(s) compra(s) en Comunarte:</p>
    ${sellers}
    <div style="width:70%;">
    ${data.payments.length > 1 ? `<p style="text-align: right; font-weight: bold;">El total de todas las compras: ${data.total_ammount.toFixed(2)}</p>` : ""}
    </div>
    <p>Para cualquier consulta o aclaración, por favor comuníquese con nuestro departamento de atención al cliente.</p>
    <p><strong>Comunarte</strong> es una empresa privada. Este recibo es solo para fines informativos y no constituye un contrato legal. No se acepta responsabilidad por errores u omisiones. Por favor, conserve este recibo para sus registros.</p>
    <p>Si tiene alguna pregunta adicional, no dude en contactarnos. Agradecemos su preferencia.</p>
    <p>Atentamente,</p>
    <p><strong>Comunarte</strong></p>
    `

    return email;
    
}

module.exports = { sendEmail, formatEmailSeller, formatEmailBuyer };
