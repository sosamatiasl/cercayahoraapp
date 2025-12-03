import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import {DocumentSnapshot} from "firebase-admin/firestore";
import {firestore} from "firebase-functions/v1";

// Inicializar la app de Admin.
admin.initializeApp();

// Obtener las credenciales de correo configuradas de forma segura.
// NOTE: functions.config ya no se llama con paréntesis en TypeScript.
const configObject: any = functions.config;
const mailConfig: any = configObject.mail;

// 1. Configurar Nodemailer con las credenciales
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: mailConfig.email, // Email del remitente (tu email)
    pass: mailConfig.password, // Contraseña de aplicación
  },
});

// 2. Exportar la función que escucha el evento de Firestore
// Detecta la creación de cualquier documento en la colección 'subscribers'
// Se utiliza DocumentSnapshot para tipar correctamente el parámetro 'snap'.
exports.sendSubscriberNotification = firestore
  .document("subscribers/{subscriberId}")
  .onCreate(async (snap: DocumentSnapshot) => {
    // Datos del nuevo suscriptor
    const newSubscriber = snap.data();

    // Verificación para el tipado
    if (!newSubscriber) {
      console.error("No se encontraron datos en el snapshot.");
      return null;
    }

    const email = newSubscriber.email || "N/A";
    // NOTE: Aseguramos que timestamp existe antes de llamar toDate().
    const timestamp=newSubscriber.timestamp && newSubscriber.timestamp.toDate ?
      newSubscriber.timestamp.toDate().toLocaleString("es-AR") : "N/A";
    const source = newSubscriber.source || "Unknown";

    // 3. Contenido del correo de notificación
    const mailOptions = {
      from: `Notificaciones CercaYAhora <${mailConfig.email}>`,
      to: mailConfig.to, // Email al que enviar la notificación
      subject: `🎉 Nuevo Suscriptor: ${email}`,
      html: `
        <div style="font-family: Arial, sans-serif; 
             padding: 20px; border: 1px solid #ccc; 
             border-radius: 8px;">
          <h2 style="color: #10B981;">
             ¡Felicitaciones! Tienes un nuevo Lead.
          </h2>
          <p>Alguien se acaba de registrar en la lista de espera de 
             <strong>Recíbelo Hoy</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; 
             margin: 15px 0;">
          <ul style="list-style: none; padding: 0;">
            <li><strong>Email:</strong> 
                <span style="font-weight: bold; color: #3B82F6;">
                   ${email}
                </span>
            </li>
            <li><strong>Fecha y Hora:</strong> ${timestamp}</li>
            <li><strong>Fuente:</strong> ${source}</li>
          </ul>
          <p style="margin-top: 20px; font-size: 0.9em; color: #6B7280;">
             Este correo es generado automáticamente por 
             Firebase Cloud Functions.
          </p>
        </div>
      `,
    };

    try {
      // 4. Enviar el correo
      await transporter.sendMail(mailOptions);
      console.log("Notificación de nuevo suscriptor enviada a:", mailConfig.to);
      return null;
    } catch (error) {
      console.error("Error al enviar el correo de notificación:", error);

      // Manejo de error de tipo unknown
      if (error instanceof Error) {
        throw new Error("Fallo en el envío del correo: " + error.message);
      } else {
        throw new Error("Fallo en el envío del correo: " + String(error));
      }
    }
  });
