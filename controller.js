var tiles = [];
// document.window.onload = function(){console.log("doc window loaded")};
// window.onload = function(){console.log("window loaded")};
// body.onload = function(){console.log("body loaded")};
window.addEventListener("DOMContentLoaded", (event) => {
  MakeBoard(4,4);
});

function MakeBoard(w,h) {
  board = document.getElementById("board");
  while (board.firstChild) {
    board.removeChild(board.lastChild);
  }
  board.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
  board.style.gridTemplateRows    = `repeat(${h}, 1fr)`;
  tiles = Array(w);
  for (i = 0; i < w; i++) {
    tiles[i] = Array(h);
    for (j = 0; j < h; j++) {
      tile = document.createElement("div");
      tile.id = i + "-" + j;
      tile.className = "tile";

      text_field = document.createElement("span");
      // text_field.textContent = `(${i}, ${j})`;
      text_field.textContent = (i * h + j + 1);
      text_field.className = "tile-text";

      tile.appendChild(text_field)
      tiles[i][j] = tile;
      board.appendChild(tile);
      // window.fitText(tile);
    }
  }
}