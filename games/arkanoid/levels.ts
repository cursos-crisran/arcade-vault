export type BlockColor =
  | "red"
  | "yellow"
  | "cyan"
  | "magenta"
  | "hotpink"
  | "green"
  | "gray";

export type BlockDef = { col: number; row: number; color: BlockColor };
export type Level = { speed: number; blocks: BlockDef[] };

const ROWS = 6;
const COLS = 10;

const rowColors1: BlockColor[] = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
const rowColors2: BlockColor[] = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
const rowColors4: BlockColor[] = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

function level1(): BlockDef[] {
  const out: BlockDef[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++)
      out.push({ col, row, color: rowColors1[row] });
  return out;
}

function level2(): BlockDef[] {
  const out: BlockDef[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < ROWS; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      out.push({ col, row, color: rowColors2[row] });
  return out;
}

function level3(): BlockDef[] {
  const out: BlockDef[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++)
      if ((col + row) % 2 === 0)
        out.push({ col, row, color: row < 3 ? "yellow" : "magenta" });
  return out;
}

function level4(): BlockDef[] {
  const gaps = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const out: BlockDef[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++)
      if (!gaps[row].includes(col))
        out.push({ col, row, color: rowColors4[row] });
  return out;
}

function level5(): BlockDef[] {
  const out: BlockDef[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        out.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }
  return out;
}

export const LEVELS: Level[] = [
  { speed: 1.0, blocks: level1() },
  { speed: 1.1, blocks: level2() },
  { speed: 1.21, blocks: level3() },
  { speed: 1.33, blocks: level4() },
  { speed: 1.46, blocks: level5() },
];
