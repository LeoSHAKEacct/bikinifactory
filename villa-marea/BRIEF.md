# Villa Marea — Higgsfield brief

A new demo site for a large contemporary villa on a Mediterranean cliff, made entirely with Higgsfield media, in the same scroll style as the other sites (logo/hero reveal, full-screen picture walk with text, videos playing inside the page).

## Access (needed before generating from a session)
- Network: `api.higgsfield.ai` in the environment's Allowed domains.
- Credentials: `HF_CREDENTIALS` = `KEY_ID:KEY_SECRET` from the Higgsfield API console, stored in the environment settings, never in chat or in this repo.
- SDK: `npm i @higgsfield/client`, then `import { higgsfield } from '@higgsfield/client/v2'` and `higgsfield.subscribe('<model-id>', { input, withPolling: true })`. Confirm each model ID on its API tab in the console (e.g. `bytedance/seedance-2.0/text-to-video`).

## Stills — Nano Banana Pro, 16:9, 4K (image 1 first, then use it as the reference for 2–6)
1. Hero: Aerial drone photograph of a vast contemporary clifftop villa above a turquoise Mediterranean sea, three long cantilevered white-stone and glass volumes stepping down the cliff, flat roofs with green planting, a long infinity pool running off the edge, olive trees and dry-stone terraces, golden hour sun low on the horizon, soft sea haze, architectural photography, ultra realistic, 24mm, no people.
2. Pool: Same villa. Eye-level view along the infinity pool edge, water merging with the open sea, teak loungers, white travertine deck, warm late-afternoon light, reflections, architectural photography, ultra realistic.
3. Living: Same villa. Double-height living room with a full-height glass wall opening onto the sea, low linen sofas, travertine floor, oak ceiling, sheer curtains moving in the breeze, natural light, interior design photography, ultra realistic.
4. Bedroom: Same villa. Primary bedroom at sunrise, bed facing a frameless glass corner over the sea, soft pink light, linen bedding, plaster walls, calm and minimal, ultra realistic.
5. Kitchen and dining: Same villa. Open kitchen with a long stone island and a dining table for twelve beside sliding glass doors to the terrace and sea, warm wood and stone, evening light, ultra realistic.
6. Night: Same villa at blue hour from the sea, every room glowing warm through the glass, illuminated pool, stars beginning, calm water reflections, ultra realistic.

## Videos — Seedance 2.0 (hero shots) / Kling 3.0 (camera moves), 16:9, 5 s, 1080p, no audio, still as start image
- From 1: Slow cinematic drone push-in toward the villa, gentle descent, waves breaking softly below the cliff.
- From 2: Slow dolly along the infinity pool edge toward the sea, water rippling, sunlight glinting.
- From 3: Smooth glide into the living room toward the glass wall, curtains moving gently, sea shimmering outside.
- From 6: Slow orbit around the villa at blue hour, lights glowing, calm sea reflections.

## Site plan
Hero video (drone push-in) under the title, then a full-screen walk through stills 2–5 with captions, the pool and living videos as moving sections, the night orbit as the closing shot, then contact.
