var n_rows, n_cols;
var board_node = null;
var timer_node = null;
var interval_id = null;
var timer_start_time = null;
var timer_started = false;

var blank_pos = [];
var solved_state_list = [];
var tile_is_clicked = false;
var last_move_pos = [];
var last_move_time = null;

var solver_started = false;
var abort_solver = false;
var move_time = 100;
var solver_promise = null;

const delay = ms => new Promise(res => setTimeout(res, ms));

// document.window.onload = function(){console.log("doc window loaded")};
// window.onload = function(){console.log("window loaded")};
// body.onload = function(){console.log("body loaded")};

window.addEventListener("DOMContentLoaded", (event) => {
  board_node = document.getElementById("board");
  timer_node = document.getElementById("timer");
  MakeBoard(4,4);
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
    if (!solver_started) {
      timer_node.style.color = 'green';
    }
    clearInterval(interval_id);
    timer_started = false;
  }
  document.getElementById("solver_button").textContent = "Solve the Board step-by-step"
}

function clearTimer() {
  StopTimer();
  timer_node.textContent = '';
  timer_node.style.color = '';
}

function getTileAt(i,j) {
  return board_node.children[n_cols * i + j];
}

function MakeBoard(w,h) {
  clearTimer();

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
  board_node.style.width               = `min(80vw, calc(80vh * ${w}/${h}))`;
  board_node.style.height              = `min(80vh, calc(80vw * ${h}/${w}))`;
  // Slight penalty to the smaller dimension because 
  // it seems that the tiles start overflowing 
  // in the longer dimension because of rounding errors
  if (w / h > 2) {
    board_node.style.height            = `min(80vh, calc(80vw * ${h}/${w} * 0.98))`;
  }
  else if (h / w > 2) {
    board_node.style.width             = `min(80vw, calc(80vh * ${w}/${h}) * 0.98)`;
  }
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
      tile.touches = []
      tile.addEventListener('click',      (x => function(){processTileClick(x);} )(tile));
      tile.addEventListener('touchstart',   (x => { 
        return (event) => {
          // console.log("outer start triggered");
          processTileTouchStart(x, event);
        }; 
      })(tile) );
      tile.addEventListener('touchend',   (x => { 
        return (event) => {
          // console.log("outer end triggered");
          processTileTouchEnd(x, event);
        }; 
      })(tile) );
      board_node.appendChild(tile);
      solved_state_list.push(tile);
      // window.fitText(tile);
    }
  }
  blank_pos = [h-1,w-1];
  getTileAt(h-1,w-1).style.visibility = "hidden";
  tile_is_clicked = false;
  last_move_pos = [];
  last_move_time = null;
}

const processTileClick = async (cur_tile, wait_time = null) => {
  if (abort_solver) {
    return;
  }

  if (wait_time == null) {
    // Load default if not specified
    // This allows dynamic changing of the parameter
    wait_time = move_time;
  }
  if (tile_is_clicked == true) {
    console.log("another tile is being processed, must disallow race conditions; tile coords are " + cur_tile.pos);
    return;
  } else {
    tile_is_clicked = true;
  }
  try {
    var cur_tile_pos = cur_tile.pos;

    // Check if we are undoing the last move.
    // Penalize a bit, and make it wait
    if (cur_tile_pos[0] == last_move_pos[0] && cur_tile_pos[1] == last_move_pos[1]) {
      var cur_time = (new Date()).getTime();
      if (cur_time < last_move_time + 2 * wait_time) {
        await delay( Math.max(0, (last_move_time + 3 * wait_time) - cur_time) );
        console.log("penalty triggered")
      }
    }

    if (Math.abs(cur_tile_pos[0] - blank_pos[0]) + Math.abs(cur_tile_pos[1] - blank_pos[1]) == 1) {
      // console.log("next to blank")
      // blank_tile = tiles[blank_pos[0]][blank_pos[1]];
      var blank_tile = getTileAt(blank_pos[0], blank_pos[1]);
      
      // Trigger the animation in the correspoding direction
      // Wait for it to finish, and then change the position
      var temp = document.createComment('')
      cur_tile.style.transitionDuration = wait_time + 'ms';
      var original_class = cur_tile.className
      if (cur_tile_pos[0] - blank_pos[0] == 1) {
        cur_tile.className += ' slide_up';
      } else if (cur_tile_pos[0] - blank_pos[0] == -1) {
        cur_tile.className += ' slide_down';
      } else if (cur_tile_pos[1] - blank_pos[1] == 1) {
        cur_tile.className += ' slide_left';
      } else {
        cur_tile.className += ' slide_right';
      } 
      await delay(wait_time);
      cur_tile.style.transitionDuration = '';
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
      
      last_move_pos = cur_tile.pos.slice();
      last_move_time = (new Date()).getTime();

      if (checkIfSolved()) {
        StopTimer();
      }
    } else {
      // console.log("not next to blank");
    }
    // console.log(cur_tile_pos);
  } finally {
    tile_is_clicked = false;  
  }
}

function processTileTouchStart(cur_tile, touch_event) {
  // console.log("inner start triggered");
  var cur_tile_pos = cur_tile.pos;
  if ( Math.abs(cur_tile_pos[0] - blank_pos[0]) + Math.abs(cur_tile_pos[1] - blank_pos[1]) == 1 ) {
    touch_event.preventDefault();
  } else {
    return;
  }
  console.log(touch_event.changedTouches[0], cur_tile);
  cur_tile.touches = cur_tile.touches.concat(Array.from(touch_event.changedTouches));
}

function processTileTouchEnd(cur_tile, touch_event, wait_time = 70) {
  // console.log("inner end triggered");
  var cur_tile_pos = cur_tile.pos;
  if ( Math.abs(cur_tile_pos[0] - blank_pos[0]) + Math.abs(cur_tile_pos[1] - blank_pos[1]) == 1 ) {
    touch_event.preventDefault();
  } else {
    return;
  }
  console.log(touch_event.changedTouches[0], cur_tile);
  var touch_end   = touch_event.changedTouches[0];
  // Find the touch with the matching identifier, and then remove it from the touches list
  var touch_i     = cur_tile.touches.findIndex(touch => touch.identifier == touch_end.identifier);
  var touch_start = cur_tile.touches[touch_i];
  cur_tile.touches.splice(touch_i,1);

  var startX = touch_start.screenX;
  var startY = touch_start.screenY;
  var   endX =   touch_end.screenX;
  var   endY =   touch_end.screenY;
  var   rad1 = Math.sqrt(touch_start.radiusX * touch_start.radiusX + touch_start.radiusY * touch_start.radiusY );
  var   rad2 = Math.sqrt(  touch_end.radiusX *   touch_end.radiusX +   touch_end.radiusY *   touch_end.radiusY );

  var displacementX = endX - startX;
  var displacementY = endY - startY;

  var distance = Math.sqrt(displacementX * displacementX + displacementY * displacementY);

  // Is it a tap?
  if (distance < 2*(rad1 + rad2)) {
    processTileClick(cur_tile, wait_time);
  }
  // Or a swipe?
  else {
    var normX = displacementX / distance;
    var normY = displacementY / distance;

    // Surprisingly, the board coords align with screen pixel corrds, except for a X-Y flip
    //    Board  : x increases downwards, y increases to the right
    //    Screen : y increases downwards, x increases to the right

    // This automatically has norm 1, by the filtering above
    blank_dir = [blank_pos[1] - cur_tile_pos[1], blank_pos[0] - cur_tile_pos[0]];
    // Dot product controls alignment
    if (blank_dir[0] * normX + blank_dir[1] * normY > 0.9) {
      processTileClick(cur_tile, wait_time);
    }
    console.log([startX, startY], [endX, endY], [displacementX, displacementY], distance, rad1, rad2, blank_dir, blank_dir[0] * normX + blank_dir[1] * normY)
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
    var [i,j] = [0,1];
    if (permutation[i] == n_tiles - 1) {
      i = 2;
    }
    if (permutation[j] == n_tiles - 1) {
      j = 2;
    }
    var temp = permutation[i];
    permutation[i] = permutation[j];
    permutation[j] = temp;
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
  clearTimer();
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

async function straight_movement(i,j, wait_time = null) {
  if (i == blank_pos[0]) {
    while(j != blank_pos[1]) {
      if (abort_solver) {
        return;
      }
      if (j > blank_pos[1]) {
        // console.log(getTileAt(blank_pos[0], blank_pos[1]+1));
        await processTileClick(getTileAt(blank_pos[0], blank_pos[1]+1), wait_time);
      } else {
        // console.log(getTileAt(blank_pos[0], blank_pos[1]-1));
        await processTileClick(getTileAt(blank_pos[0], blank_pos[1]-1), wait_time);
      }
    }
  } else if (j == blank_pos[1]) {
    while(i != blank_pos[0]) {
      if (abort_solver) {
        return;
      }
      if (i > blank_pos[0]) {
        await processTileClick(getTileAt(blank_pos[0]+1, blank_pos[1]), wait_time);
      } else {
        await processTileClick(getTileAt(blank_pos[0]-1, blank_pos[1]), wait_time);
      }
    }
  }
}

// Moves the blank tile to the given position
async function moveBlankToPos(i,j, vertical_first = false, wait_time = null) {
  if (vertical_first) {
    await straight_movement(i,blank_pos[1], wait_time);
    await straight_movement(blank_pos[0],j, wait_time);
  } else {
    await straight_movement(blank_pos[0],j, wait_time);
    await straight_movement(i,blank_pos[1], wait_time);
  }
}

// Moves the blank tile to while avoiding all tiles 
// numerically smaller than the target position
// i.e. x < b.x or (y < b.y if x == b.x)
async function move_Blank_To_Pos_While_Avoiding_Solved(i,j, wait_time = null) {
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
  await moveBlankToPos(i,j, false, wait_time);
}

async function rotateLoop(arr, n=1, wait_time = null) {
  if (n == 0 || arr.length < 4 ) {
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
  if (blank_segment == null) {
    return;
  }

  var original_blank_pos = blank_pos.slice();
  var original_segment = blank_segment;

  var loops_completed = 0;
  while (loops_completed < n) {
    if (abort_solver) {
      return;
    }
    next_segment = (blank_segment + 1) % arr.length
    await straight_movement(arr[next_segment][0], arr[next_segment][1], wait_time);
    if (next_segment == original_segment) {
      loops_completed += 1
    }
    // console.log("did segment " + blank_segment + 
    //   ", now on " + blank_pos +
    //   ", " + loops_completed + " loops completed" )
    blank_segment = next_segment;
  }
  if (blank_pos != original_blank_pos) {
    await straight_movement(original_blank_pos[0], original_blank_pos[1], wait_time);
  }
}

// Rotates the square [lower_i, lower_i+1] x [lower_j, lower_j+1]
// `n` times clockwise (blank tiles moves anti-clockwise)
// Negative `n` means anti-clockwise
async function rotate_2x2_Square(square_pos, n=1, wait_time = null) {
  var [lower_i, lower_j] = square_pos;
  if (lower_i == n_rows - 1 || lower_j == n_cols - 1) {
    return;
  }
  if ( !(lower_i <= blank_pos[0] && blank_pos[0] <= lower_i + 1
      && lower_j <= blank_pos[1] && blank_pos[1] <= lower_j + 1 ) ) {
    return;
  }
  if (n == 0) {
    return;
  }

  var offset = blank_pos.map((e,i) => e - square_pos[i]);
  if (n > 0) {
    for (var i = 0; i < n; i++) {
      if (abort_solver) {
        return;
      }
      if      (offset[0] == 0   && offset[1] == 0  ) {
        offset = [1,0];
      } 
      else if (offset[0] == 1 && offset[1] == 0  ) {
        offset = [1,1];
      } 
      else if (offset[0] == 1 && offset[1] == 1) {
        offset = [0,1];
      } 
      else  /*(offset[0] == 0 && offset[1] == 1)*/ {
        offset = [0,0];
      }
      var click_pos = square_pos.map((e,i) => e + offset[i]);
      await processTileClick(getTileAt(click_pos[0], click_pos[1]), wait_time);
    }
  } else {
    for (var i = 0; i < -n; i++) {
      if (abort_solver) {
        return;
      }
      if      (offset[0] == 0   && offset[1] == 0  ) {
        offset = [0,1];
      } 
      else if (offset[0] == 0 && offset[1] == 1  ) {
        offset = [1,1];
      } 
      else if (offset[0] == 1 && offset[1] == 1) {
        offset = [1,0];
      } 
      else  /*(offset[0] == 1 && offset[1] == 0)*/ {
        offset = [0,0];
      }
      var click_pos = square_pos.map((e,i) => e + offset[i]);
      await processTileClick(getTileAt(click_pos[0], click_pos[1]), wait_time);  
    }
  }
}

async function solve_Board_step_by_step() {
  if (abort_solver) {
    return;
  }
  var wait_time = null;

  var target_pos = [0,0];
  solver_started = true;
  timer_node.style.color = 'blue';

  // Last two rows need to be solved with different techniques
  while (target_pos[0] < n_rows-2) {
    if (abort_solver) {
      return;
    }
    // if (abort_solver){
    //   abort_solver = false;
    //   return;
    // }
    var target_tile = solved_state_list[target_pos[0] * n_cols + target_pos[1]];
    var cur_pos = target_tile.pos;
    if (cur_pos[0] == target_pos[0] && cur_pos[1] == target_pos[1]) {
      target_pos[1] += 1
      if (target_pos[1] >= n_cols) {
        target_pos[0] += 1
        target_pos[1] = 0
      }
      continue;
    }

    // Move blank tile to target position, simplifies code
    // Also update tile position
    await move_Blank_To_Pos_While_Avoiding_Solved(target_pos[0], target_pos[1], wait_time);
    var cur_pos = target_tile.pos;

    // Assumption, everything before the current pos is solved, i.e
    //  ###
    //  #T0    <==     # is before T, and 0 is after T i.e. # < T < 0
    //  000 
    // and all # are solved. So cur_pos >= target_pos necessarily.
    // 
    // Only valid if the current_pos is not along the wall.
    if (target_pos[1] < n_cols - 1) {
      var loop = [];
      var n_loops = 0;
      if (cur_pos[1] > target_pos[1]) {
        if (cur_pos[0] > target_pos[0]) {
          loop= [
                  [target_pos[0], target_pos[1]], 
                  [target_pos[0],    cur_pos[1]], 
                  [   cur_pos[0],    cur_pos[1]], 
                  [   cur_pos[0], target_pos[1]], 
                ];
          n_loops = (cur_pos[1] - target_pos[1]) + (cur_pos[0] - target_pos[0]) - 1
        } else { // cur_pos[0] == target_pos[0]
          loop= [
                  [target_pos[0]    , target_pos[1]],
                  [target_pos[0]    ,    cur_pos[1]], 
                  [target_pos[0] + 1,    cur_pos[1]], 
                  [target_pos[0] + 1, target_pos[1]],
                ];
          n_loops = (cur_pos[1] - target_pos[1]) - 1
        }
      } else if (cur_pos[1] == target_pos[1]) {
        loop= [
                [target_pos[0], target_pos[1]    ], 
                [   cur_pos[0], target_pos[1]    ],  
                [   cur_pos[0], target_pos[1] + 1], 
                [target_pos[0], target_pos[1] + 1],  
              ]
        n_loops = (cur_pos[0] - target_pos[0]) - 1
      } else { // i.e. cur_pos[1] < target_pos[1]
        if (cur_pos[0] == target_pos[0] + 1) {
          loop= [
                  [target_pos[0]    , target_pos[1]    ], 
                  [   cur_pos[0]    , target_pos[1]    ],
                  [   cur_pos[0]    ,    cur_pos[1]    ], 
                  [target_pos[0] + 2,    cur_pos[1]    ], 
                  [target_pos[0] + 2, target_pos[1] + 1], 
                  [target_pos[0]    , target_pos[1] + 1], 
                ];
          n_loops = (target_pos[1] - cur_pos[1])
        } else { // cur_pos[0] > target_pos[0] + 1
          loop= [
                  [target_pos[0]    , target_pos[1]    ], 
                  [target_pos[0] + 1, target_pos[1]    ],
                  [target_pos[0] + 1,    cur_pos[1]    ], 
                  [   cur_pos[0]    ,    cur_pos[1]    ], 
                  [   cur_pos[0]    , target_pos[1] + 1], 
                  [target_pos[0]    , target_pos[1] + 1], 
                ];
          n_loops = (target_pos[1] - cur_pos[1]) + (cur_pos[0] - target_pos[0] - 1)
        }
      }
      await rotateLoop(loop, n_loops, wait_time);
      
      if (abort_solver) {
        return;
      }
      await processTileClick(target_tile, wait_time);
    }
    // Extra steps if the next pos is along the wall 
    // i.e. target_pos[1] == n_cols - 1
    else {
      console.log("edge case")
      // First, go from prev at next to wall, to prev at the wall position
      //   ###          ###
      //   #P_    =>    #_P
      //   000          000 
      var prev_tile = solved_state_list[target_pos[0] * n_cols + target_pos[1] - 1];
      
      if (abort_solver) {
        return;
      }
      await processTileClick(prev_tile, wait_time);

      // Move blank to the position below the prev tile
      //   ###          ###
      //   #_P    =>    #0P
      //   000          00_ 
      await moveBlankToPos(target_pos[0]+1, target_pos[1], true, wait_time);
      if (abort_solver) {
        return;
      }
      var cur_pos = target_tile.pos;

      // Case 1 : It is just below, perfectly positioned
      //          Just click it to solve
      if (cur_pos[0] == target_pos[0] + 1 && cur_pos[1] == target_pos[1]) {
        if (abort_solver) {
          return;
        }
        await processTileClick(target_tile, wait_time);
      }
      // Case 2 : We just boxed it into the previous position
      //          Needs some maneuvering
      else if (cur_pos[0] == target_pos[0] && cur_pos[1] == target_pos[1] - 1) {
        console.log("super special case");
        // await delay(2000);
        
        // The current position evolves as
        //   ###          ###          ###          ###          ###          ###
        //   #CP    =>    #0C    =>    #0C    =>    #C0    =>    #C0    =>    #PC
        //   00_          0P_          0_0          0_0          0P_          00_
        //   000          000          0P0          0P0          000          000
        // This would be unsolvable without extra tiles

        await rotate_2x2_Square([target_pos[0]  , target_pos[1]-1], +4, wait_time); // or -4
        // await delay(2000);
        await rotate_2x2_Square([target_pos[0]+1, target_pos[1]-1], -3, wait_time);
        // await delay(2000);
        await rotate_2x2_Square([target_pos[0]  , target_pos[1]-1], -3, wait_time); // or +4
        // await delay(2000);
        await rotate_2x2_Square([target_pos[0]+1, target_pos[1]-1], +4, wait_time);
        // await delay(2000);
        await rotate_2x2_Square([target_pos[0]  , target_pos[1]-1], +3, wait_time); // or -3
        //                                                                      ^
        // These alternatives are valid,                                         
        // but give a solution that triggers the move undo penalty
      } 
      // Case 3 : It is somewhere else
      // We can form a loop with the target and blank tile
      else {
        // On the same row
        if (cur_pos[0] == target_pos[0]+1) { 
          loop= [
            [target_pos[0]+1, target_pos[1]],
            [target_pos[0]+1,    cur_pos[1]],
            [target_pos[0]+2,    cur_pos[1]],
            [target_pos[0]+2, target_pos[1]],
          ];
          n_loops = (target_pos[1] - cur_pos[1]) - 1;
        } 
        // On the same column
        else if (cur_pos[1] == target_pos[1]) { 
          loop= [
            [target_pos[0]+1, target_pos[1]  ],
            [   cur_pos[0]  , target_pos[1]  ],
            [   cur_pos[0]  , target_pos[1]-1],
            [target_pos[0]+1, target_pos[1]-1],
          ];
          n_loops = (cur_pos[0] - target_pos[0]-1) - 1;
        }
        // In the general space, can form a big loop 
        else  {
          loop= [
                  [target_pos[0]+1, target_pos[1]], 
                  [   cur_pos[0]  , target_pos[1]], 
                  [   cur_pos[0]  ,    cur_pos[1]], 
                  [target_pos[0]+1,    cur_pos[1]], 
                ];
          n_loops = (target_pos[1] - cur_pos[1]) + (cur_pos[0] - target_pos[0]-1) - 1
        }
        await rotateLoop(loop, n_loops, wait_time);
        if (abort_solver) {
          return;
        }
        await processTileClick(target_tile, wait_time);

        await move_Blank_To_Pos_While_Avoiding_Solved(target_pos[0]+1, target_pos[1]-1, wait_time);
        await rotate_2x2_Square([target_pos[0], target_pos[1]-1], -3, wait_time);
      }
    }
    console.log("did " + target_pos);
    
    target_pos[1] += 1
    if (target_pos[1] >= n_cols) {
      target_pos[0] += 1;
      target_pos[1] = 0;
    }
  }

  // Last 2 rows except last 2x2
  while (target_pos[1] < n_cols - 2) {
    var target_1 = solved_state_list[ target_pos[0]    * n_cols + target_pos[1]];
    var target_2 = solved_state_list[(target_pos[0] +1)* n_cols + target_pos[1]];

    var cur_pos_1 = target_1.pos;
    var cur_pos_2 = target_2.pos;
    if (cur_pos_1[0] == target_pos[0]     && cur_pos_1[1] == target_pos[1]
     && cur_pos_2[0] == target_pos[0] + 1 && cur_pos_2[1] == target_pos[1]) {
      // The tiles are aligned already
      target_pos[1] += 1;
      continue;
    }

    
    // Take the horizontal route to avoid the undo penalty
    await moveBlankToPos(target_pos[0], target_pos[1], false, wait_time); 
    cur_pos_1 = target_1.pos;
    cur_pos_2 = target_2.pos;

    // Assume that all positions with both coords smaller are solved i.e.
    // ###
    // #_0
    // #00
    // Now we position the second target i.e. lower tile in that place
    var loop = []
    var n_loops = 0;
    // target is under the blank tile
    if (cur_pos_2[1] == target_pos[1]) {
      // pass;
    }
    // target is in the same row
    else if (cur_pos_2[0] == target_pos[0]) {
      loop = [
        [target_pos[0]  , target_pos[1]],
        [target_pos[0]  ,  cur_pos_2[1]],
        [target_pos[0]+1,  cur_pos_2[1]],
        [target_pos[0]+1, target_pos[1]],
      ];
      n_loops = (cur_pos_2[1] - target_pos[1]) - 1;
    }
    // general loop is formed with the blank and the target
    else {
      loop = [
        [target_pos[0], target_pos[1]],
        [target_pos[0],  cur_pos_2[1]],
        [ cur_pos_2[0],  cur_pos_2[1]],
        [ cur_pos_2[0], target_pos[1]],
      ];
      n_loops = (cur_pos_2[1] - target_pos[1]) + 1/*==(cur_pos_2[0] - target_pos[0])*/ - 1;
    }
    await rotateLoop(loop, n_loops, wait_time);
    if (abort_solver) {
      return;
    }
    await processTileClick(target_2, wait_time);

    // Now we position target_1 i.e. the upper tile next to it 
    await move_Blank_To_Pos_While_Avoiding_Solved(target_pos[0], target_pos[1] + 1, wait_time); 
    var cur_pos_1 = target_1.pos;

    // Upper tile is right under lower tile, maneuvering is needed
    if (cur_pos_1[1] == target_pos[1]) {
      // We need to execute the following
      //   ####          ####          ####          ####          ####          ####
      //   #L_0    =>    #0_0    =>    #0_U    =>    #L_U    =>    #LU0    =>    #U_0
      //   #U00          #LU0          #L00          #000          #0_0          #L00
      var square_1 = target_pos;
      var square_2 = [target_pos[0], target_pos[1] + 1]
      await rotate_2x2_Square(square_1, -4, wait_time);
      await rotate_2x2_Square(square_2, +4, wait_time);
      await rotate_2x2_Square(square_1, +4, wait_time);
      await rotate_2x2_Square(square_2, -3, wait_time);
      await rotate_2x2_Square(square_1, -3, wait_time);
    }
    // Upper tile can loop to location
    else {
      var loop = [];
      var n_loops = [];
      // Under blank tile
      if (cur_pos_1[1] == target_pos[1]+1) {
        // pass;
      }
      // target is in the same row
      else if (cur_pos_1[0] == target_pos[0]) {
        loop = [
          [target_pos[0]  , target_pos[1]+1],
          [target_pos[0]  ,  cur_pos_1[1]  ],
          [target_pos[0]+1,  cur_pos_1[1]  ],
          [target_pos[0]+1, target_pos[1]+1],
        ];
        n_loops = (cur_pos_1[1] - target_pos[1]-1) - 1;
      }
      // general loop is formed
      else {
        loop = [
          [target_pos[0], target_pos[1]+1],
          [target_pos[0],  cur_pos_1[1]  ],
          [ cur_pos_1[0],  cur_pos_1[1]  ],
          [ cur_pos_1[0], target_pos[1]+1],
        ];
        n_loops = (cur_pos_1[1] - target_pos[1]-1) + 1/*==(cur_pos_1[0] - target_pos[0])*/ - 1;
      }
      await rotateLoop(loop, n_loops, wait_time);
      if (abort_solver) {
        return;
      }
      await processTileClick(target_1, wait_time);
      // Now we have
      //   ####
      //   #LU0
      //   #000

      await moveBlankToPos(target_pos[0]+1, target_pos[1]+1, true, wait_time);
      await rotate_2x2_Square(target_pos, -3, wait_time);
    }
    console.log("did " + target_pos);
    target_pos[1] += 1;
  }

  // Last 2x2
  // Symbols are 11 = E, 12 = T, 15 = F, blank = _ for the 4,4 board
  var last_tile = solved_state_list[n_cols * n_rows - 2];
  await moveBlankToPos(n_rows-1, n_cols-1,true, wait_time);
  if (last_tile.pos[0] == n_rows-1 && last_tile.pos[1] == n_cols - 2) {
    // This is solved
    // ###
    // #ET
    // #F_
  } 
  // One clock-wise rotation is needed
  // ###
  // #TF
  // #E_
  else if (last_tile.pos[0] == n_rows - 2 && last_tile.pos[1] == n_cols - 1) {
    await rotate_2x2_Square([n_rows-2, n_cols-2], +4, wait_time);
  } 
  else /* if (last_tile.pos[0] == n_rows - 2 && last_tile.pos[1] == n_cols - 2) */ {
    // One counter-clockwise rotation is needed
    // ###
    // #FE
    // #T_
    await rotate_2x2_Square([n_rows-2, n_cols-2], -4, wait_time);
  }

  console.log("done with steps");
  StopTimer();
  solver_started = false;
  move_time = 100;
}