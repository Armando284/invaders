# INVADERS.EXE — Plan de desarrollo

## Visión
Arcade de *space invaders* ASCII retro (TypeScript + Vite + Canvas 2D) en estética
de terminal fósforo-verde con overlay CRT. El jugador defiende una grilla 40×24 de
la **FORMACIÓN** hostil (`W` walker, `^` wing, `@` elite) protegido por **ESCUDOS**
(`#`), esquiva balas enemigas, derriba el **UFO** (`<=>`) que cruza arriba y limpia
cada ola para sumar bonus. Paleta neón (verde/#ffcc33/#ff8833), fuente monospace,
sonido WebAudio, secuencia de boot terminal y tablón de high-scores top-5.

## Estado actual — Fases 1 a 8 completadas

| Fase | Scope | Estado |
| --- | --- | --- |
| **1** | Base: formación 10×3 con descenso y velocidad por wave, 3 escudos desgastables, UFO, vidas e invencibilidad, shooters de columna, hi-score + tablón top-5 con iniciales arcade, partículas + screen shake + glow, overlay CRT, boot terminal, título y GAME OVER, pausa (P/Esc), mute persistente (M) | ✅ |
| **2** | **Pantalla grande estilo MAZE**: `CELL_SIZE` 24 → canvas 960×576, frame `min(960px, 100vw)`, HUD y UI escalados con utilidades `ui()`/`uiFont()` | ✅ |
| **3** | **Controles táctiles** (patrón MAZE): dpad + botones `FIRE/START/PAUSE/MUTE` que despachan `KeyboardEvent` sintéticos, visibles solo en táctil/celulares | ✅ |
| **4** | **Game feel**: **hitstop** por kill (35–90 ms, +1,6 ms ×puntos, 120 ms UFO), **cadencia de disparo** (220 ms + **burst doble** de 70 ms, máx 2 balas), **retroceso** del cañón y **muzzle flash** | ✅ |
| **5** | **Racha/combo**: ventana 1,2 s → multiplicador `xN` (×2…×5, tope), popup dorado `+P xN`, **pitch del sonido** por racha, reset al fallar/window, **slow-mo** al morir (0,3 s a mitad de velocidad) | ✅ |
| **6** | **Modificadores de wave**: shooters por columna (1→2→3), límite de balas enemigas en pantalla (3→5), patrones **diagonal** (wave 3+, 45%) y **seno** (wave 5+, 30%), **UFO escalado** (valor `base × ⌈wave/2⌉`), bonus de wave `500 × wave`; **power-ups**: caída 7% por kill — `RAPID` (cooldown 90 ms, 8 s), `DOUBLE` (3 balas, 8 s), `SHIELD` (invencible 6 s), `BOMBA` (limpia disparos + formación); drops parpadeantes (R/D/S/B) e indicador de buff en HUD | ✅ |
| **7** | **Adopción**: **semilla diaria** (misma invasión para todos ese día) con RNG determinista `mulberry32` para todo el azar de partida; **replay de la misma semilla** (ENTER en GAME OVER, `T` títulos, `R` en pausa); **score card copiable** (`C` o botón COPY móvil): `INVADERS.EXE // fecha // SEED // SCORE // WAVE`; **logros** (5) persistentes con toast dorado y contador en el título | ✅ |
| **8** | **Música dinámica**: loop chiptune de 16 pasos **compuesto ad-hoc** (bajo a corcheas con síncopa + golpes de lead fuera de tiempo, **distinto del tema de MAZE**) con **tempo que se acelera con la acción** (`aliveCount≤3`→0.65, racha ×5→0.7, buff activo→0.85, intro 0.9, muerte 0.55); arranca con la partida, pausa/resume con P y para al game over; **estado de power-ups**: HUD con etiqueta `RAPID n`, **barra de tiempo** que drena y **parpadeo rojo** al quedar ≤2 s (también SHIELD, que ahora muestra temporizador) | ✅ |

## Decisiones técnicas y convenciones

- TS ~6.0.2 con `tsconfig` estricto: `verbatimModuleSyntax` (usar `import type`
  para tipos), `noUnusedLocals/Parameters`, `erasableSyntaxOnly` e imports con
  extensión `.ts`.
- **Arquitectura de archivos** (`src/`):
  - `main.ts` — canvas, cables Boot → `Game`, overlay de arranque.
  - `game.ts` — orquestador (bucle, estado, colisiones, scoring, logros, copia).
  - `game-state.ts` — `GameState`, `GameStatus`, `Popup`, `Particle`, `ScoreEntry`, `Drop`.
  - `constants.ts` / `geometry.ts` — formar, timing, colores, rects/utilidades.
  - `player.ts` / `invader.ts` (formación + shooters) / `shield.ts` / `ufo.ts` /
    `projectile.ts` (patrones 0 recto / 1 diagonal / 2 seno).
  - `renderer.ts` — todo el dibujo (mundo, HUD, overlays, glowing, drops).
  - `audio.ts` — clase `Sfx` (no `Audio`, choca con el tipo DOM de `window`).
  - `boot.ts` — secuencia de arranque tipo terminal; input bloqueado hasta ready.
  - `touch-controls.ts` — botones táctiles → `KeyboardEvent` sintéticos.
  - `rng.ts` — `mulberry32`, `dailySeed()`, `seedLabel`, `todayIso`.
- **localStorage**: `invaders-scores` (top-5 JSON), `invaders-hi-score`,
  `invaders-muted`, `invaders-achievements` (ids), `invaders-stats` (`ufoKills`).
- **RNG determinista**: todo el azar de *gameplay* (shooter, patrón/fase de bala,
  lado/valor/respawn del UFO, caída/tipo de drop) usa `this.rng` (seed); las
  partículas y la lluvia de menús siguen con `Math.random` (puramente visuales).
- **Gotchas ya resueltos**: el constructor `Sfx` exige gesto del usuario
  (`unlock()` desde `keydown`); `navigator.clipboard` necesita contexto seguro →
  fallback con `execCommand`; los popups también se pintan/anegan en game over y
  victoria (feedback de `COPIED`/logros).

## Controles

- **Teclado**: ←/→ o A/D mover · ESPACIO disparar (mantener = cadencia + burst) ·
  P / Esc pausar · en pausa R reiniciar (misma semilla) / Q salir al título · M mute.
- **GAME OVER**: ENTER reiniciar la misma semilla · T volver a títulos · C copiar resultado.
- **Victoria**: ENTER endless defense · C copiar resultado.
- **Táctil**: dpad + FIRE + fila START/PAUSE/COPY/MUTE (móvil, `@media (pointer:coarse)`).

## Verificación

- Suite de tests: `node --test 'src/**/*.test.mjs'` (**38/38** — formación,
  shooters por columna, bosquejo de invader, balas, patrones diagonal/seno,
  escudos, RNG determinista, estado de partida). Node 24 tipa-strips los `.ts`
  importados desde los `.test.mjs` (que van sin anotaciones TS).
- Build: `tsc` limpio + `vite build` (JS ~37,3 kB / gzip ~12,2 kB).

## Roadmap futuro

El juego está feature-complete siguiendo el plan (game feel → bucle → adopción).
Ideas abiertas a propuesta del usuario: endless con dificultad más empinada,
ranking global por seed diaria, variantes de misión (escudos rotos, modo sniper),
2 jugadores por turnos estilo MAZE, o atract modo demo.