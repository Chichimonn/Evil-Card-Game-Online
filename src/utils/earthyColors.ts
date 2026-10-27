// Palette of rich, atmospheric dark fantasy earthy tones
const EARTHY_TONES = [
  // Terracotta & Clay
  '#3d281d',
  '#4a3022',
  '#543727',
  '#452c20',
  '#503324',
  '#5b3a29',
  '#42291d',
  
  // Moss & Forest Green
  '#223123',
  '#293b2a',
  '#2f4230',
  '#263527',
  '#324434',
  '#3b4c3c',
  '#2c3d2e',
  
  // Ochre, Sandstone & Umber
  '#3e3524',
  '#473c29',
  '#4f432e',
  '#393021',
  '#443927',
  '#524630',
  '#4a3e2a',
  
  // Peat & River Rock Slate
  '#262a27',
  '#2c302d',
  '#323633',
  '#292d2a',
  '#343835',
  '#242825',
  
  // Muted Bronze & Tree Bark
  '#3c2f25',
  '#44352a',
  '#4c3c2f',
  '#372b21',
  '#423428',
  '#4e3e31'
];

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROWS = [1, 2, 3, 4, 5, 6];

/** Tile colours for the board. A match passes its seeded random so both players see the same board. */
export function generateEarthyHexColors(random: () => number = Math.random): Record<string, string> {
  const map: Record<string, string> = {};

  COLUMNS.forEach((col) => {
    ROWS.forEach((row) => {
      const hexId = `${col}${row}`;
      const randomColor = EARTHY_TONES[Math.floor(random() * EARTHY_TONES.length)];
      map[hexId] = randomColor;
    });
  });

  return map;
}
