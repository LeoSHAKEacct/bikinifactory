# Oriental Wellness Center: WhatsApp booking server

A small server (a Cloudflare Worker, free tier) between the website and the WhatsApp Business Platform.

```
website bot ──POST /book──▶ server ──▶ customer: "solicitud recibida"
                                   └─▶ staff mobile: booking + [Confirmar] [Otra hora]
staff taps a button ──webhook──▶ server ──▶ customer: "cita confirmada" / "elige otra hora"
every minute ──▶ server ──▶ 30 min after a confirmed session ends: customer gets the Google review link
```

## 1. Number

Register the clinic's number **+507 6785-2323** under the company's WhatsApp Business Account
(WhatsApp Manager → Phone numbers → Add). Use **coexistence** so the clinic keeps using the
WhatsApp Business app on the same number and sees every message the server sends.

The staff buttons need a **different** phone (e.g. Dr. Tsang's personal mobile): a number can't
message itself. Put it in `STAFF_PHONE`.

## 2. Message templates (WhatsApp Manager → Message templates), language Spanish `es`

| Name | Category | Body | Buttons |
|---|---|---|---|
| `cita_recibida` | Utility | Hola {{1}}, recibimos tu solicitud de {{2}} para el {{3}} a las {{4}}. Te confirmamos en breve por este chat. | — |
| `nueva_cita` | Utility | Nueva solicitud: {{1}}, {{2}} a las {{3}}. Cliente: {{4}} ({{5}}). | Quick reply: `Confirmar`, `Otra hora` |
| `cita_confirmada` | Utility | Hola {{1}}, tu cita de {{2}} queda CONFIRMADA para el {{3}} a las {{4}}. Te esperamos en Oriental Wellness Center. | — |
| `cita_otra_hora` | Utility | Hola {{1}}, el horario de {{2}} del {{3}} a las {{4}} ya no está disponible. Respóndenos con otra hora que te sirva y te la reservamos. | — |
| `resena_google` | Utility | Hola {{1}}, gracias por tu visita. ¿Cómo te sentiste con tu {{2}}? Tu opinión en Google nos ayuda mucho. | URL: `Dejar reseña` → https://maps.app.goo.gl/RxkfF9YyPGKULd2ZA |

Meta may move `resena_google` to the Marketing category; that's fine, it just costs a little more per message.

## 3. Deploy (on a computer with Node.js)

```bash
npm i -g wrangler
wrangler login
wrangler d1 create oriental-citas            # paste the database_id into wrangler.toml
wrangler d1 execute oriental-citas --remote --file=schema.sql
wrangler secret put WA_TOKEN                 # permanent System User token (whatsapp_business_messaging)
wrangler secret put WA_PHONE_ID              # phone number ID of +507 6785-2323
wrangler secret put VERIFY_TOKEN             # any string you invent
wrangler secret put APP_SECRET               # App → Settings → Basic → App secret
wrangler deploy                              # prints the server address
```

## 4. Connect

- Meta App → WhatsApp → Configuration → Webhook: callback `https://<server>/webhook`,
  the same VERIFY_TOKEN, subscribe to **messages**.
- Website: in `oriental/index.html` set `const BOT_URL = 'https://<server>';`.
  Empty means bookings keep going through wa.me links.
