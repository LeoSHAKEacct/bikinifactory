# Clínica Veterinaria Nuevo Occidente — web + bot de WhatsApp

```
nuevooccidente/
  index.html          la web (una página, carga los precios de data/clinica.json)
  data/clinica.json   ÚNICA fuente de precios, servicios, dirección y horario (web + bot)
  api/_bot.js         el "cerebro" del bot (palabras clave -> respuestas)
  api/whatsapp.js     webhook de WhatsApp Cloud API (Meta)
  api/bot-demo.js     el chat de prueba de la web (mismas respuestas)
```

## Cambiar precios
Edita `data/clinica.json` y haz commit. `precio: null` muestra "Consultar"; `"desde": true` muestra "desde $…".
Cuando los precios sean los reales, pon `"precios_de_ejemplo": false` (quita el aviso amarillo y la nota del bot).
Rellena también `direccion`, `maps_url` y `horario`.

## Qué hace el bot
- Entiende texto libre: "cuánto vale castrar una gata", "precio vacuna gato", "rayos x", "baño perro grande".
- Menú con lista y botones de WhatsApp (Consultas, Vacunas, Cirugías, Laboratorio, Spa, Tienda, Horario, Cita, Asesor).
- "Agendar cita", "asesor", urgencias, audios/fotos → pasa a una persona y **se calla 12 h en ese chat**
  (`BOT_PAUSE_HOURS`). Si alguien del equipo contesta desde la app (modo coexistencia), el bot también se calla.
  El cliente puede escribir **menú** para volver al bot.

## Conectar a WhatsApp (una vez)
1. developers.facebook.com → crear app tipo *Business* → añadir producto **WhatsApp**.
2. Registrar el número. Para seguir usando la app WhatsApp Business en el celular con el mismo número,
   elegir la opción de **conectar una cuenta existente de WhatsApp Business (coexistencia)**.
3. Crear un *System User* en Meta Business con permisos `whatsapp_business_messaging` y generar un token permanente.
4. En Vercel (proyecto de esta carpeta, Root Directory = `nuevooccidente`) poner las variables:
   `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` (inventada), `WHATSAPP_APP_SECRET`.
   Opcional: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` para que la pausa sobreviva reinicios.
5. En WhatsApp → Configuración → Webhook: URL `https://<dominio>/api/whatsapp`, el mismo verify token,
   y suscribir los campos `messages` y `smb_message_echoes`.

Costos: las respuestas dentro de las 24 h después de que el cliente escribe no se cobran (conversaciones de servicio).
