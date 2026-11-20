# SPEC 03 — Página "Acerca de" y envío del formulario de contacto con Resend

> **Status:** Implementado
> **Depends on:** SPEC 02
> **Date:** 2026-11-20
> **Objective:** Reemplazar el placeholder de `/about` por la página "Acerca de" + "Contacto" de `references/templates/home-about/about.jsx`, y enviar el formulario de contacto por correo con Resend mediante una Server Action.

---

## Por qué existe esta spec

La SPEC 02 dejó `/about` como placeholder ("PRÓXIMAMENTE") y sacó de su alcance portar `about.jsx`. Esta spec lo porta, con el mismo marcado, textos y nombres de clase que la plantilla.

En la plantilla el formulario no envía nada: `onSubmit` solo muestra el terminal de éxito. Aquí el envío es real: el servidor valida los datos y envía el mensaje con Resend.

Esta spec modifica `app/about/page.tsx`, creado en la SPEC 02. Es un cambio intencional de esa spec.

El CSS de esta página no está en `app/globals.css`. Vive en `references/templates/home-about/styles.css` (bloque "ABOUT PAGE") y se anexa a `globals.css`.

---

## Scope

**In:**

- `app/about/page.tsx` renderiza `<About />` y define `metadata.title` ("Acerca de | Arcade Vault").
- `components/about.tsx` (cliente): sección "Acerca de" (kicker, título, misión, 3 highlights), divisor de píxeles y sección "Contacto" (intro, tips y formulario), con los mismos textos de la plantilla.
- Iconos `HEART`, `BROWSER` y `PLANT` del componente `HighlightIcon`, con el SVG de la plantilla.
- Hook `useReveal`: se extrae de `components/home.tsx` a `lib/use-reveal.ts` y lo usan `home.tsx` y `about.tsx`. Sin cambio de comportamiento en el home.
- Anexar a `app/globals.css` el bloque "ABOUT PAGE" de `styles.css` (líneas 1071–1147), con `@keyframes shake` y `@keyframes pxblink`, y la regla `.btn.press:active` (línea 1132) si no existe ya.
- Server Action `sendContactMessage` en `app/about/actions.ts` que valida y envía el correo con el SDK `resend`.
- Formulario conectado con `useActionState`: estado inicial, enviando, éxito (terminal de la plantilla) y error.
- Validación en servidor: campos obligatorios, formato de correo, límites de longitud y campo honeypot oculto.
- Variables de entorno `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `CONTACT_TO_EMAIL`, documentadas en `.env.example`.
- Dependencia `resend` en `package.json`.

**Out of scope (para futuras specs):**

- Rate limit por IP, CAPTCHA o cualquier almacenamiento para anti-spam.
- Guardar los mensajes en base de datos o en archivo.
- Correo de confirmación o respuesta automática al remitente.
- Plantillas HTML de correo (`react-email`). El correo va en texto plano.
- Dominio propio verificado en Resend (configuración externa, no es código).
- Tests automatizados e internacionalización.
- Cambios en el Nav, el Footer o el resto de páginas, salvo la extracción de `useReveal`.

---

## Data model

```ts
// app/about/actions.ts
"use server";

export type ContactFormState =
  | { status: "idle" }
  | { status: "success"; name: string }              // name ya normalizado (trim)
  | {
      status: "error";
      message: string;                                // aviso para mostrar en el formulario
      fields?: Partial<Record<"name" | "email" | "msg", string>>; // error por campo
      values: { name: string; email: string; msg: string };       // para conservar lo escrito
    };

export async function sendContactMessage(
  prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState>;
```

Campos del `FormData`: `name`, `email`, `msg` y `website` (honeypot).

Reglas de validación (servidor):

| Campo   | Regla                                        |
| ------- | -------------------------------------------- |
| `name`  | `trim()`, obligatorio, máx. 60 caracteres    |
| `email` | `trim()`, obligatorio, formato de correo, máx. 120 caracteres |
| `msg`   | `trim()`, obligatorio, máx. 2000 caracteres  |
| `website` | Debe venir vacío. Si trae valor, se responde `success` sin enviar nada (el bot no recibe pistas) |

Correo enviado a Resend:

- `from`: `RESEND_FROM_EMAIL`.
- `to`: `CONTACT_TO_EMAIL`.
- `replyTo`: el correo del visitante.
- `subject`: `[Arcade Vault] Mensaje de <name>`.
- `text`: nombre, correo y mensaje, en ese orden.

Variables de entorno (solo servidor, sin prefijo `NEXT_PUBLIC_`):

```
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CONTACT_TO_EMAIL=
```

Este cambio no introduce claves nuevas de `localStorage`.

---

## Implementation plan

Antes de empezar, leer en `node_modules/next/dist/docs/01-app`: `02-guides/forms.md`, `02-guides/environment-variables.md` y `02-guides/data-security.md`. Consultar la documentación vigente del SDK de Resend para la firma de `emails.send`.

1. Extraer `useReveal` de `components/home.tsx` a `lib/use-reveal.ts` e importarlo en `home.tsx`. Verificación: `bun run lint` y `tsc` sin errores, y `/` sigue revelando sus secciones.
2. Anexar a `app/globals.css` el bloque "ABOUT PAGE" de `styles.css` (líneas 1071–1147) y `.btn.press:active` si falta. Verificación: `bun run build` sin errores y las demás páginas se ven igual que antes.
3. Instalar `resend` con `bun add resend`. Crear `.env.example` con las tres variables vacías. Verificación: `bun run build` sin errores. `.env*` ya está en `.gitignore`: confirmar con `git check-ignore .env.local` y que `.env.example` se versione (añadir `!.env.example` a `.gitignore`).
4. Crear `app/about/actions.ts` con `sendContactMessage`: leer y normalizar el `FormData`, aplicar el honeypot, validar, enviar con Resend y devolver `ContactFormState`. Si falta alguna variable de entorno o Resend devuelve error, devolver `status: "error"` con un mensaje genérico y registrar el detalle con `console.error` en el servidor. Verificación: `tsc` sin errores.
5. Crear `components/about.tsx` con las secciones "Acerca de" y "Contacto", `HighlightIcon` y el formulario con `useActionState(sendContactMessage, { status: "idle" })`. El botón se deshabilita y muestra "ENVIANDO…" mientras `pending`. El terminal de éxito usa `state.name` en mayúsculas y "ENVIAR OTRO MENSAJE" reinicia el formulario. El estado de error muestra un aviso sobre el botón y conserva los valores (`defaultValue` desde `state.values`). Verificación: `tsc` sin errores.
6. Reemplazar `app/about/page.tsx` para que renderice `<About />` con su `metadata`. Verificación: `/about` muestra la página completa y conserva Nav y Footer.
7. Probar el envío real con una API key de desarrollo: caso feliz, campos vacíos, correo inválido, honeypot lleno y variables de entorno ausentes. Verificación: los criterios de aceptación.

---

## Acceptance criteria

- [X] `bun run build` y `bun run lint` terminan sin errores.
- [X] `/about` muestra el kicker "▸ ACERCA DE", el título "ACERCA DE ARCADE VAULT", el párrafo de misión y 3 highlights con los textos de la plantilla.
- [X] `/about` muestra el divisor de píxeles (24 cuadros) y la sección "▸ CONTACTO" con el título "CONTÁCTANOS", el texto de intro y los 3 tips.
- [X] El highlight "HECHO CON ❤️ PARA JUGADORES" usa la clase `magenta`, "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR" usa `cyan` y "PROYECTO EN CONSTANTE CRECIMIENTO" usa `green`.
- [X] Las secciones con clase `reveal` reciben la clase `in` al entrar en el viewport, también en `/`.
- [X] El formulario tiene los campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE con los placeholders de la plantilla, y el botón "▶  ENVIAR MENSAJE".
- [X] Con datos válidos y variables de entorno correctas, llega un correo a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de <name>`, el nombre, el correo y el mensaje en el cuerpo, y `Reply-To` igual al correo del visitante.
- [X] Tras el envío exitoso aparece el terminal "VAULT-OS // TERMINAL" con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>.".
- [X] "ENVIAR OTRO MENSAJE" vuelve al formulario con los tres campos vacíos.
- [X] Mientras se envía, el botón está deshabilitado y dice "ENVIANDO…". No se puede enviar dos veces.
- [X] Enviar con cualquier campo vacío (o solo espacios) no envía correo, aplica la animación `shake` y muestra un aviso de error con los valores escritos conservados.
- [X] Enviar un correo sin formato válido (por ejemplo `abc`) no envía correo y muestra un error en el campo de correo.
- [X] Un mensaje de más de 2000 caracteres no envía correo y muestra un error.
- [X] Con el campo oculto `website` lleno, la UI muestra el éxito pero Resend no recibe ninguna llamada.
- [X] Con `RESEND_API_KEY` ausente o inválida, el formulario muestra el aviso de error, conserva lo escrito y permite reintentar. El mensaje al usuario no revela la causa ni la clave.
- [X] `RESEND_API_KEY` no aparece en el bundle del cliente (`grep -r "re_" .next/static` sin resultados).
- [X] El campo `website` no es visible ni accesible con teclado (`tabIndex={-1}`, `aria-hidden`, `autoComplete="off"`).
- [X] La consola del navegador no muestra errores ni warnings de React en `/about`, ni en `/` tras extraer `useReveal`.
- [X] A 375 px de ancho `/about` se ve en una columna sin desbordar horizontalmente.
- [X] `.env.example` existe, lista las tres variables vacías y está versionado. `.env.local` no.

---

## Decisions

- **Sí:** Server Action con `useActionState`. La API key nunca llega al cliente y la validación vive en el servidor. **No:** Route Handler `/api/contact`, porque no hay otro cliente que lo consuma.
- **Sí:** remitente, destino y clave por variables de entorno. Cambiar de entorno no toca código. **No:** correos fijos en el código.
- **Sí:** en desarrollo el remitente puede ser `onboarding@resend.dev`, que solo entrega al correo de la cuenta de Resend. Para producción hace falta un dominio verificado, fuera del alcance de esta spec.
- **Sí:** validación básica más honeypot. Cubre errores de usuario y bots simples sin infraestructura. **No:** rate limit ni CAPTCHA, que requieren almacenamiento y merecen su propia spec.
- **Sí:** honeypot responde "éxito" sin enviar. El bot no aprende que fue detectado.
- **Sí:** mensaje de error inline que conserva lo escrito. La plantilla solo hacía `shake`, que no distingue un fallo de validación de uno del servidor. Es una desviación intencional. **No:** limpiar el formulario al fallar.
- **Sí:** correo en texto plano con `replyTo` al visitante, para responder directo desde el cliente de correo. **No:** `react-email` ni HTML, por simplicidad.
- **Sí:** mismo marcado, textos y nombres de clase que `about.jsx`. Es el método de las SPEC 01 y 02. La lógica de `useState`, `onSubmit` y `shake` se adapta a `useActionState`. El `shake` se dispara al recibir `status: "error"`.
- **Sí:** el texto de la plantilla "RESPUESTA EN 24-48H" y "SIN SPAM, JAMÁS" se mantiene tal cual.
- **Sí:** anexar el CSS al final de `globals.css`, como en la SPEC 02. **No:** CSS aparte ni reescritura en Tailwind.
- **Sí:** extraer `useReveal` a `lib/use-reveal.ts` para no duplicarlo. **No:** copiarlo dentro de `about.tsx`.
- **Sí:** `app/about/page.tsx` sigue siendo componente de servidor y `components/about.tsx` es cliente.
- **Sí:** `bun` como gestor de paquetes (`bun.lock`). Se agrega la dependencia con `bun add resend`.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Resend rechaza el remitente (dominio no verificado o `onboarding@resend.dev` con destino ajeno) | Documentar la limitación en `.env.example`. El error se registra en el servidor y la UI muestra el aviso genérico. |
| La API key se filtra al cliente o al repositorio | Variable sin prefijo `NEXT_PUBLIC_`, uso solo en `actions.ts` con `"use server"`, `.env*` ignorado, criterio de aceptación con `grep` sobre `.next/static`. |
| Spam o abuso del formulario | Honeypot y límites de longitud. El rate limit queda explícitamente fuera de alcance. |
| `cacheComponents` falla en el build por la Server Action o la página | Mantener `app/about/page.tsx` estático y poner toda la interacción en el componente cliente. Leer antes las guías indicadas en el plan. |
| Extraer `useReveal` rompe el home | Paso 1 aislado con verificación manual de `/` antes de seguir. |
| Anexar CSS duplica reglas existentes (`.btn.press`, `blink`) | Revisar nombres con `grep` antes de anexar y omitir lo ya presente. |
| El usuario envía varias veces por doble clic | Botón deshabilitado con `pending` de `useActionState`. |

---

## What is **not** in this spec

- Rate limit, CAPTCHA o anti-spam avanzado.
- Persistencia de mensajes.
- Correo de confirmación al visitante.
- Plantillas HTML o `react-email`.
- Configuración de dominio en Resend.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se hace, va en su propia spec.
