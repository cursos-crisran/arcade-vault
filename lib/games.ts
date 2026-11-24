export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number;
  plays: string;
};

export const GAMES: Game[] = [
  {
    id: "asteroides",
    title: "ASTEROIDES",
    short: "Destruye el campo de asteroides y sobrevive.",
    long: "Pilota tu nave en un campo de asteroides. Rota, propulsa y dispara para partir las rocas en fragmentos cada vez más pequeños. Recoge el power-up 3x para disparar en abanico.",
    cat: "SHOOTER",
    cover: "cover-asteroides",
    color: "cyan",
    best: 0,
    plays: "0",
  },
  {
    id: "tetris",
    title: "TETRIS",
    short: "Encaja las piezas y limpia líneas sin llegar al techo.",
    long: "Ocho piezas descienden sobre un tablero de 10×20. Muévelas, rótalas y déjalas caer para completar líneas. Cada 10 líneas sube el nivel y la caída se acelera. Incluye una pieza extra: la tuerca.",
    cat: "PUZZLE",
    cover: "cover-tetris",
    color: "magenta",
    best: 0,
    plays: "0",
  },
  {
    id: "arkanoid",
    title: "ARKANOID",
    short: "Rompe 5 muros de bloques con una pelota que no deja de acelerar.",
    long: "Mueve la paleta con las flechas o el ratón y rebota la pelota para derribar cinco muros de bloques de colores. Cada nivel cambia el patrón y acelera la pelota. Tienes 3 vidas: si la pelota cae, pierdes una.",
    cat: "ARCADE",
    cover: "cover-arkanoid",
    color: "magenta",
    best: 0,
    plays: "0",
  },
  {
    id: "snake",
    title: "SNAKE",
    short: "Come frutas, crece y no te muerdas la cola.",
    long: "Guía a la serpiente por el tablero con las flechas o WASD. Cada fruta suma 10 puntos y la hace crecer; cada 5 frutas sube el nivel y la serpiente se acelera. Las paredes te devuelven por el lado opuesto, pero si te muerdes pierdes una de tus 3 vidas.",
    cat: "ARCADE",
    cover: "cover-snake",
    color: "green",
    best: 0,
    plays: "0",
  },
];

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const satisfies readonly [
  "TODOS",
  ...GameCategory[],
];

// Categorías con al menos un juego, en el orden de CATS, precedidas por "TODOS".
export function getCategories(games: Game[]): ["TODOS", ...GameCategory[]] {
  const present = new Set(games.map((game) => game.cat));
  const cats = CATS.filter(
    (cat): cat is GameCategory => cat !== "TODOS" && present.has(cat),
  );
  return ["TODOS", ...cats];
}

export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}
