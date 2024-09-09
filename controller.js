var n_rows, n_cols;
var board_node = null;
var timer_node = null;
var interval_id = null;
var timer_start_time = null;
var timer_started = false;

var blank_pos = [];
var solved_state_list = [];
var tile_is_clicked = false;

const delay = ms => new Promise(res => setTimeout(res, ms));

// document.window.onload = function(){console.log("doc window loaded")};
// window.onload = function(){console.log("window loaded")};
// body.onload = function(){console.log("body loaded")};

window.addEventListener("DOMContentLoaded", (event) => {
  board_node = document.getElementById("board");
  timer_node = document.getElementById("timer");
  MakeBoard(10,10);
});

function UpdateTimer() {
  time_diff = (new Date()).getTime() - timer_start_time;

  milliseconds = time_diff % 1000;
  time_diff_in_seconds = Math.floor(time_diff / 1000);

  seconds = time_diff_in_seconds % 60;
  time_diff_in_minutes = Math.floor(time_diff_in_seconds / 60);

  minutes = time_diff_in_minutes % 60;
  time_diff_in_hours = Math.floor(time_diff_in_minutes / 60);
  
  hours = time_diff_in_hours;

  if (hours != 0) {
    timer_node.textContent = hours + ':' + (minutes+'').padStart(2,'0') + ':' + (seconds+'').padStart(2,'0') + '.' + (milliseconds+'').padStart(3,'0')
  } else if (minutes != 0) {
    timer_node.textContent = minutes + ':' + (seconds+'').padStart(2,'0') + '.' + (milliseconds+'').padStart(3,'0')
  } else if (seconds != 0) {
    timer_node.textContent = seconds + '.' + (milliseconds+'').padStart(3,'0')
  } else {
    timer_node.textContent = `${milliseconds}ms`
  }
}

function StartTimer() {
  if (timer_started) {
    clearInterval(interval_id);
    timer_started = false;
  }
  timer_node.style.color = 'red';
  timer_start_time = (new Date()).getTime();
  interval_id = setInterval(UpdateTimer, 73);
  timer_started = true;
}

function StopTimer() {
  if (timer_started) {
    timer_node.style.color = 'green';
    clearInterval(interval_id);
    timer_started = false;
  }
}

function getTileAt(i,j) {
  return board_node.children[n_cols * i + j];
}

function MakeBoard(w,h) { 
  w = parseInt(w)
  h = parseInt(h)
  if (! (Number.isInteger(w) && Number.isInteger(h)) ){
    console.log('invalid input for board dimension, doing nothing');
    return;
  }

  // while (board.firstChild) {
  //   board.removeChild(board.lastChild);
  // }
  // Apparently replacing with empty is simpler
  // https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren#examples
  board_node.replaceChildren();

  board_node.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
  board_node.style.gridTemplateRows    = `repeat(${h}, 1fr)`;
  n_rows = h;
  n_cols = w;
  solved_state_list = [];
  
  // tiles = Array(w);
  for (i = 0; i < w; i++) {
    // tiles[i] = Array(h);
    for (j = 0; j < h; j++) {
      tile = document.createElement("div");
      // tile.id = i + "-" + j;
      tile.pos = [i,j];
      tile.className = "tile";
      tile.style.gridC

      text_field = document.createElement("span");
      // text_field.textContent = `(${i}, ${j})`;
      text_field.textContent = (i * h + j + 1);
      text_field.className = "tile-text";

      tile.appendChild(text_field)
      // tiles[i][j] = tile;
      // Extra layer to capture the `tile` variable to the scope, 
      // so it doesn't change (for the onclick) with the for loop
      tile.onclick = (x => function(){processTileClick(x);} )(tile);
      board_node.appendChild(tile);
      solved_state_list.push(tile);
      // window.fitText(tile);
    }
  }
  blank_pos = [h-1,w-1];
  getTileAt(h-1,w-1).style.visibility = "hidden";
  tile_is_clicked = false;
}

const processTileClick = async (cur_tile) => {
  if (tile_is_clicked == true) {
    console.log("another tile is being processed, must disallow race conditions; tile coords are " + cur_tile.pos);
    return;
  } else {
    tile_is_clicked = true;
  }
  try {
    cur_tile_pos = cur_tile.pos;
    if (Math.abs(cur_tile_pos[0] - blank_pos[0]) + Math.abs(cur_tile_pos[1] - blank_pos[1]) == 1) {
      console.log("next to blank")
      // blank_tile = tiles[blank_pos[0]][blank_pos[1]];
      blank_tile = getTileAt(blank_pos[0], blank_pos[1]);
      
      // Trigger the animation in the correspoding direction
      // Wait for it to finish, and then change the position
      var temp = document.createComment('')
      original_class = cur_tile.className
      if (cur_tile_pos[0] - blank_pos[0] == 1) {
        cur_tile.className += ' slide_up';
      } else if (cur_tile_pos[0] - blank_pos[0] == -1) {
        cur_tile.className += ' slide_down';
      } else if (cur_tile_pos[1] - blank_pos[1] == 1) {
        cur_tile.className += ' slide_left';
      } else {
        cur_tile.className += ' slide_right';
      } 
      await delay(100);
      cur_tile.className = original_class;

      // temp = document.createElement("div");
      // temp.replaceChildren(cur_tile.children);
      // cur_tile.replaceChildren(blank_tile.children);
      // blank_tile.replaceChildren(temp.children);
      // Don't swap children, swap the nodes in DOM
      cur_tile.replaceWith(temp)
      blank_tile.replaceWith(cur_tile)
      temp.replaceWith(blank_tile)


      // Swap in array. Defunct after replacing array with a yfunction
      // temp = tiles[blank_pos[0]][blank_pos[1]];
      // tiles[blank_pos[0]][blank_pos[1]] = tiles[cur_tile_pos[0]][cur_tile_pos[1]];
      // tiles[cur_tile_pos[0]][cur_tile_pos[1]] = temp;

      // Swap internally stored positions
      cur_tile.pos = blank_pos;
      blank_tile.pos = cur_tile_pos;
      blank_pos = cur_tile_pos;
      if (checkIfSolved()) {
        StopTimer();
      }
    } else {
      console.log("not next to blank");
    }
    console.log(cur_tile_pos);
  } finally {
    tile_is_clicked = false;  
  }
}

function generatePermutation(n) {
  arr = []
  for (var i = 0; i < n; i++) {
    arr.push(Math.floor(Math.random() * (n-i)));
    // arr.push(0);
  }
  // console.log(arr);
  for (var i = n-2; i >= 0; i--) {
    // a = arr.toString();
    for (var j = i+1; j < n; j++) {
      // console.log(i,j, arr[i], arr[j], arr[j] >= arr[i], arr);
      if (arr[j] >= arr[i]) {
        arr[j] += 1;
      }
    }
    // console.log(`(${i}) : ` + a + ' => ' + arr.toString())
  }
  return arr;
}

function getCyclesInPermutation(arr, return_decomposition = false) {
  n = arr.length;
  n_cycles = 0;
  checked = Array(n).fill(false);
  if (return_decomposition) 
    cycle_decomposition = '';
  for (var i = 0; i < n; i++) {
    if (checked[i] == false) {
      var index = i;
      n_cycles += 1;
      if (return_decomposition)
        cycle_decomposition += ' (';
      while (checked[index] == false) {
        checked[index] = true;
        if (return_decomposition)
          cycle_decomposition += ` ${index}`;
        index = arr[index];
      }
      if (return_decomposition)
        cycle_decomposition += ' )';
    }
  }
  if (return_decomposition) 
    return {n_cycles, cycle_decomposition};
  else 
    return n_cycles;
}

function getParityOfPermutation(arr) {
  n = arr.length
  n_transpositions = 0
  for (var i = 0; i < n; i++) {
    for (var j = i + 1; j < n; j++) {
      if (arr[i] > arr[j]) {
        n_transpositions += 1
      }
    }
  }
  return n_transpositions;
}

function permuteBoard() {
  n_tiles = solved_state_list.length;
  permutation = generatePermutation(n_tiles);
  for (var i = 0; permutation.every((x,i) => x == i) && i < 1024; i++) {
    permutation = generatePermutation(n_tiles);
    console.log("Got identity perm, will try again")
  }
  if (permutation.every((x,i) => x == i)) {
    console.log("Time to give up, permutation function might be broken");
    return;
  }
  console.log(permutation, getCyclesInPermutation(permutation, true), getParityOfPermutation(permutation));

  // Flip two elements if permutation parity is inconsistent 
  // with position parity of blank tile.
  parity_of_permutation = (n_tiles - getCyclesInPermutation(permutation)) % 2

  perm_position_of_blank_tile = permutation.findIndex(x => x == (n_tiles - 1));
  board_pos_of_blank_tiles = [(n_rows - 1 - Math.floor(perm_position_of_blank_tile / n_cols)),  (n_cols - 1 - (perm_position_of_blank_tile % n_cols))]
  parity_of_blank_tile = (board_pos_of_blank_tiles[0] + board_pos_of_blank_tiles[1]) % 2

  console.log(board_pos_of_blank_tiles, parity_of_permutation)
  if ( parity_of_blank_tile != parity_of_permutation ) {
    temp = permutation[0];
    permutation[0] = permutation[1];
    permutation[1] = temp;
  }
  console.log(permutation, getCyclesInPermutation(permutation, true), getParityOfPermutation(permutation));

  board_node.replaceChildren();
  for (var i = 0; i < n_tiles; i++) {
    board_node.appendChild(solved_state_list[permutation[i]]);
    solved_state_list[permutation[i]].pos = [Math.floor(i / n_cols), i % n_cols ]
    if (permutation[i] == n_tiles - 1) {
      blank_pos = solved_state_list[permutation[i]].pos
    }
  }
}

function put_Board_In_Solved_Order_Instantly() {
  n_tiles = solved_state_list.length;
  board_node.replaceChildren();
  for (var i = 0; i < n_tiles; i++) {
    board_node.appendChild(solved_state_list[i]);
    solved_state_list[i].pos = [Math.floor(i / n_cols), i % n_cols]
  }
  StopTimer();
  timer_node.textContent = '';
  blank_pos=[n_rows-1,n_cols-1];
  tile_is_clicked = false;
}

function checkIfSolved() {
  var n_tiles = solved_state_list.length
  for (var i = 0; i < n_tiles; i++) {
    var x = Math.floor(i / n_cols);
    var y = i % n_cols;
    if (solved_state_list[i] != getTileAt(x,y))
      return false;
  }
  return true;
}

async function straight_movement(i,j) {
  if (i == blank_pos[0]) {
    while(j != blank_pos[1]) {
      if (j > blank_pos[1]) {
        console.log(getTileAt(blank_pos[0], blank_pos+1));
        await processTileClick(getTileAt(blank_pos[0], blank_pos[1]+1));
      } else {
        console.log(getTileAt(blank_pos[0], blank_pos-1));
        await processTileClick(getTileAt(blank_pos[0], blank_pos[1]-1));
      }
    }
  } else if (j == blank_pos[1]) {
    while(i != blank_pos[0]) {
      if (i > blank_pos[0]) {
        await processTileClick(getTileAt(blank_pos[0]+1, blank_pos[1]));
      } else {
        await processTileClick(getTileAt(blank_pos[0]-1, blank_pos[1]));
      }
    }
  }
}

// Moves the blank tile to the given position
async function moveBlankToPos(i,j, vertical_first = false) {
  if (vertical_first) {
    await straight_movement(i,blank_pos[1]);
    await straight_movement(blank_pos[0],j);
  } else {
    await straight_movement(blank_pos[0],j);
    await straight_movement(i,blank_pos[1]);
  }
}

// Moves the blank tile to while avoiding all tiles 
// numerically smaller than the target position
// i.e. x < b.x or (y < b.y if x == b.x)
async function move_Blank_To_Pos_While_Avoiding_Solved(i,j) {
  // Orignal plan : take blank to target, b -> t
  // Different movement for 
  // - when (b.y < t.y and b.x > t.x) 
  //     (can be any order of movement)
  // - when (b.y > t.y and b.x > t.x)
  //     (must be horizontal -> vertical)
  // - when b.x < t.x or (b.y < t.y if b.x == t.x)
  //     since the blank tile is in the solve area, 
  // 
  // But all can be resolved by adopting (horizontal, then vertical) movement as standard.
  await moveBlankToPos(i,j, false);
}

// Assumes blank is on the loop
async function rotateLoop(arr, n=1) {
  if (n == 0) {
    return;
  } else if (n < 0) {
    n = -n;
    arr.reverse();
  }

  blank_segment = null;
  for (var i = 0; i < arr.length; i++) {
    next_i = (i+1) % arr.length
    if (! (arr[i][0] == arr[next_i][0] || arr[i][1] == arr[next_i][1])) {
      return;
    }
    if ( (arr[i][0] == arr[next_i][0] && arr[i][0] == blank_pos[0])
      || (arr[i][1] == arr[next_i][1] && arr[i][1] == blank_pos[1]) ){
      blank_segment = i;
    }
  }
  var original_blank_pos = blank_pos.slice();
  var original_segment = blank_segment
  ;
  var loops_completed = 0;
  while (loops_completed < n) {
    next_segment = (blank_segment + 1) % arr.length
    await straight_movement(arr[next_segment][0], arr[next_segment][1]);
    if (next_segment == original_segment) {
      loops_completed += 1
    }
    // console.log("did segment " + blank_segment + 
    //   ", now on " + blank_pos +
    //   ", " + loops_completed + " loops completed" )
    blank_segment = next_segment;
  }
  if (blank_pos != original_blank_pos) {
    await straight_movement(original_blank_pos[0], original_blank_pos[1]);
  }
}
