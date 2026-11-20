"use server";

import { Resend } from "resend";

export type ContactFormState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | {
      status: "error";
      message: string;
      fields?: Partial<Record<"name" | "email" | "msg", string>>;
      values: { name: string; email: string; msg: string };
    };

const MAX_NAME = 60;
const MAX_EMAIL = 120;
const MAX_MSG = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const name = read(formData, "name");
  const email = read(formData, "email");
  const msg = read(formData, "msg");
  const website = read(formData, "website");

  // Honeypot: el bot recibe "éxito" y no se envía nada.
  if (website) return { status: "success", name };

  const fields: Partial<Record<"name" | "email" | "msg", string>> = {};
  if (!name) fields.name = "Escribe tu nombre.";
  else if (name.length > MAX_NAME)
    fields.name = `Máximo ${MAX_NAME} caracteres.`;

  if (!email) fields.email = "Escribe tu correo.";
  else if (email.length > MAX_EMAIL)
    fields.email = `Máximo ${MAX_EMAIL} caracteres.`;
  else if (!EMAIL_RE.test(email)) fields.email = "Correo no válido.";

  if (!msg) fields.msg = "Escribe un mensaje.";
  else if (msg.length > MAX_MSG) fields.msg = `Máximo ${MAX_MSG} caracteres.`;

  const values = { name, email, msg };

  if (Object.keys(fields).length > 0) {
    return {
      status: "error",
      message: "REVISA LOS CAMPOS MARCADOS.",
      fields,
      values,
    };
  }

  const genericError: ContactFormState = {
    status: "error",
    message: "NO PUDIMOS ENVIAR TU MENSAJE. INTENTA DE NUEVO.",
    values,
  };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !from || !to) {
    console.error(
      "[contact] Faltan variables de entorno: RESEND_API_KEY, RESEND_FROM_EMAIL o CONTACT_TO_EMAIL.",
    );
    return genericError;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    });

    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return genericError;
    }
  } catch (err) {
    console.error("[contact] Fallo al enviar con Resend:", err);
    return genericError;
  }

  return { status: "success", name };
}
