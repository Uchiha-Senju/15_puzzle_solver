var n_rows, n_cols;

var blank_pos = [];
var board_node = [];

var getFunction

// document.window.onload = function(){console.log("doc window loaded")};
// window.onload = function(){console.log("window loaded")};
// body.onload = function(){console.log("body loaded")};

function getTileAt(i,j) {
  return board_node.children[n_cols * i + j];
}

window.addEventListener("DOMContentLoaded", (event) => {
  board_node = document.getElementById("board");
  MakeBoard(4,4);
});

function processTileClick(cur_tile) {
  cur_tile_pos = cur_tile.pos;
  if (Math.abs(cur_tile_pos[0] - blank_pos[0]) + Math.abs(cur_tile_pos[1] - blank_pos[1]) == 1) {
    console.log("next to blank")
    // blank_tile = tiles[blank_pos[0]][blank_pos[1]];
    blank_tile = getTileAt(blank_pos[0], blank_pos[1]);
    
    // temp = document.createElement("div");
    // temp.replaceChildren(cur_tile.children);
    // cur_tile.replaceChildren(blank_tile.children);
    // blank_tile.replaceChildren(temp.children);
    // Don't swap children, swap the nodes in DOM
    var temp = document.createComment('')
    cur_tile.replaceWith(temp)
    blank_tile.replaceWith(cur_tile)
    temp.replaceWith(blank_tile)

    // Swap in array. Defunct after replacement with function
    // temp = tiles[blank_pos[0]][blank_pos[1]];
    // tiles[blank_pos[0]][blank_pos[1]] = tiles[cur_tile_pos[0]][cur_tile_pos[1]];
    // tiles[cur_tile_pos[0]][cur_tile_pos[1]] = temp;

    // Swap internally stored positions
    cur_tile.pos = blank_pos;
    blank_tile.pos = cur_tile_pos;
    blank_pos = cur_tile_pos;
  } else {
    console.log("not next to blank");
  }
  console.log(cur_tile_pos);
}

function MakeBoard(w,h) {
  board = document.getElementById("board");
  // while (board.firstChild) {
  //   board.removeChild(board.lastChild);
  // }
  // Apparently replacing with empty is simpler
  // https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren#examples
  board.replaceChildren();

  board.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
  board.style.gridTemplateRows    = `repeat(${h}, 1fr)`;
  n_rows = h;
  n_cols = w;
  
  // tiles = Array(w);
  for (i = 0; i < w; i++) {
    // tiles[i] = Array(h);
    for (j = 0; j < h; j++) {
      tile = document.createElement("div");
      // tile.id = i + "-" + j;
      tile.pos = [i,j];
      tile.className = "tile";

      text_field = document.createElement("span");
      // text_field.textContent = `(${i}, ${j})`;
      text_field.textContent = (i * h + j + 1);
      text_field.className = "tile-text";

      tile.appendChild(text_field)
      // tiles[i][j] = tile;
      // Extra layer to capture the `tile` variable to the scope, 
      // so it doesn't change (for the onclick) with the for loop
      tile.onclick = (x => function(){processTileClick(x);} )(tile);
      board.appendChild(tile);
      // window.fitText(tile);
    }
  }
  blank_pos = [h-1,w-1];
  getTileAt(h-1,w-1).style.visibility = "hidden";
}