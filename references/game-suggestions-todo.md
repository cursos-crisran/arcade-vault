# Sugerencias de juegos

Memoria del agente `game-planner`. Criterios (1–5): **div** = diversidad de categorías, **fact** = factibilidad en canvas 2D, **clas** = reconocimiento clásico. **Total** = suma (máx. 15).

## Implementados

| id | Categoría |
|----|-----------|
| asteroides | SHOOTER |
| tetris | PUZZLE |
| arkanoid | ARCADE |
| snake | ARCADE |

## Pendientes

Agrupados por categoría, ordenados por total descendente.

### VERSUS

| id | div | fact | clas | total | fecha | nota |
|----|:---:|:----:|:----:|:-----:|-------|------|
| paletas | 5 | 5 | 5 | **15** | 2026-11-25 | Duelo de paletas contra CPU (estilo pong); primera VERSUS; puntaje por puntos ganados + racha, vidas = puntos que puedes conceder, niveles = CPU más rápida |
| circuito-turbo | 5 | 4 | 5 | **14** | 2026-11-25 | Carrera top-down vs 3 coches CPU con derrape; vidas = choques |
| duelo-orbital | 5 | 4 | 3 | **12** | 2026-11-25 | Duelo de dos naves con gravedad de estrella, vs CPU o 2 jugadores |
| billar-relampago | 5 | 3 | 4 | **12** | 2026-11-25 | Billar vs reloj o CPU; colisiones entre muchas bolas |

### PUZZLE

| id | div | fact | clas | total | fecha | nota |
|----|:---:|:----:|:----:|:-----:|-------|------|
| gemas-cascada | 4 | 5 | 5 | **14** | 2026-11-25 | Intercambiar gemas vecinas, líneas de 3+, cascadas y combos; movimientos o tiempo como vidas |
| eco-colores | 4 | 5 | 5 | **14** | 2026-11-25 | Memoria: repetir secuencia creciente de 4 paneles de color; 3 vidas; sonido con Web Audio |
| parejas-memoria | 4 | 5 | 4 | **13** | 2026-11-25 | Voltear cartas para hallar pares; multiplicador por aciertos seguidos, fallos quitan vidas |
| campo-minado | 4 | 4 | 5 | **13** | 2026-11-25 | Buscaminas con cursor de teclado; control con teclado menos natural |
| fusion-2048 | 3 | 5 | 4 | **12** | 2026-11-25 | Deslizar fichas y fusionar potencias de 2; partida a veces larga, sin vidas reales |
| empuja-cajas | 4 | 4 | 4 | **12** | 2026-11-25 | Sokoban; requiere diseñar niveles resolubles, poco rejugable |

### SHOOTER

| id | div | fact | clas | total | fecha | nota |
|----|:---:|:----:|:----:|:-----:|-------|------|
| invasores | 3 | 5 | 5 | **13** | 2026-11-25 | Oleadas de invasores que descienden, escudos destructibles; SHOOTER ya tiene asteroides |
| enjambre-galactico | 3 | 5 | 5 | **13** | 2026-11-25 | Matamarcianos vertical con formaciones y picados; se parece a invasores |
| arena-gemela | 3 | 5 | 4 | **12** | 2026-11-25 | Twin-stick en arena cerrada, hordas y multiplicador por racha |
| escudo-urbano | 3 | 4 | 5 | **12** | 2026-11-25 | Defensa antimisiles, 6 ciudades como vidas |
| galeria-tiro | 3 | 5 | 4 | **12** | 2026-11-25 | Tiro al blanco de feria, munición limitada, combo |
| laberinto-blaster | 3 | 4 | 4 | **11** | 2026-11-25 | Laberinto cenital con salas, disparo en 8 direcciones, perseguidor invencible |

### ARCADE

| id | div | fact | clas | total | fecha | nota |
|----|:---:|:----:|:----:|:-----:|-------|------|
| ala-batiente | 3 | 5 | 5 | **13** | 2026-11-25 | Pájaro de un botón esquiva columnas; el más barato de implementar |
| devora-laberinto | 2 | 5 | 5 | **12** | 2026-11-25 | Laberinto con puntos, 4 espectros con IA distinta, píldora de poder |
| cruce-rana | 2 | 5 | 5 | **12** | 2026-11-25 | Cruzar tráfico y río hasta 5 refugios |
| corredor-infinito | 2 | 5 | 4 | **11** | 2026-11-25 | Endless runner con salto y agachada |
| ciempies-jardin | 2 | 5 | 4 | **11** | 2026-11-25 | Ciempiés que se parte en segmentos entre setas, arañas |
| torre-escalador | 2 | 4 | 5 | **11** | 2026-11-25 | Subir plataformas esquivando barriles |
| pinball-neon | 3 | 3 | 5 | **11** | 2026-11-25 | Pinball con flippers y bumpers; física de rebote compleja |

## Descartados

| id | fecha | motivo |
|----|-------|--------|
| _(ninguno)_ | | |
