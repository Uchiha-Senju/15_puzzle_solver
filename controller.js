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
  tiles = Array(w);
  for (i = 0; i < w; i++) {
    tiles[i] = Array(h);
    for (j = 0; j < h; j++) {
      tile = document.createElement("div");
      tile.idName = i + "-" + "j";
      tile.textContent = `(${i}, ${j})`;
      tiles[i][j] = tile;
      board.appendChild(tile);
    }
  }
}