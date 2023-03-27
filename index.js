ctx.fillStyle = "black";
ctx.strokeStyle = "white";

let toExpand,
  startIndex,
  endIndex,
  maze,
  iterations,
  maxStackSize,
  emptyCellsCount;

const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
function generateMaze(numIterations) {
  const cells = [];

  const startIterations = iterations;

  while (
    startIterations + numIterations > iterations++ &&
    endIndex > startIndex
  ) {
    maxStackSize = Math.max(maxStackSize, endIndex - startIndex);

    let cell;
    if (Math.random() > paramConfig.getVal("explore-desire")) {
      cell = toExpand[--endIndex];
    } else {
      cell = toExpand[startIndex++];
    }

    const blankNeighbours = directions
      .map(([y, x]) => [y + cell[0], x + cell[1]])
      .filter(([y, x]) => (maze[y]?.[x] ?? 0) === -1);

    let nextCell = null;
    if (blankNeighbours.length === 1) {
      nextCell = blankNeighbours[0];
    } else if (blankNeighbours.length > 1) {
      // Re-adding the current cell since there's more neighbours to expand
      toExpand[endIndex++] = cell;
      nextCell =
        blankNeighbours[Math.floor(Math.random() * blankNeighbours.length)];
    }

    if (nextCell != null) {
      maze[nextCell[0]][nextCell[1]] = maze[cell[0]][cell[1]] + 1;
      toExpand[endIndex++] = nextCell;
      cells.push(nextCell);
    }
  }

  return cells;
}

function drawCell([y, x]) {
  // ctx.fillStyle = `hsl(${
  //   ((maze[y][x] / paramConfig.getVal("width")) * 10) % 360
  // }, 100%, 50%)`;
  ctx.fillStyle = `hsl(${
    (maze[y][x] / paramConfig.getVal("colour-cycle-freq")) % 360
  }, 100%, 50%)`;
  // ctx.fillStyle = `hsl(${maze[y][x] % 360}, 100%, 50%)`;
  const cellWidth = canvas.width / paramConfig.getVal("width");
  const cellHeight = canvas.height / paramConfig.getVal("height");
  ctx.fillRect(
    Math.round(x * cellWidth),
    Math.round(y * cellHeight),
    Math.ceil(cellWidth),
    Math.ceil(cellHeight)
  );
}

let lastRun;
function draw() {
  const now = new Date().getTime();
  const cellsToFill = Math.min(
    Math.round(((now - lastRun) / 1000) * paramConfig.getVal("iter-per-sec")),
    paramConfig.getVal("iter-per-sec") / 10
  );
  lastRun = now;

  const cellsFilled = generateMaze(cellsToFill);
  emptyCellsCount -= cellsFilled.length;
  $("#curr-memory-number").text(endIndex - startIndex);

  cellsFilled.forEach(drawCell);
  $("#empty-cells-number").text(emptyCellsCount);
  $("#efficiency-number").text(
    Math.round(
      (100 * iterations) /
        (paramConfig.getVal("width") * paramConfig.getVal("height") -
          emptyCellsCount)
    ) / 100
  );
  $("#iterations-number").text(iterations);
  $("#max-memory-number").text(maxStackSize);

  // Animation code

  if (endIndex > startIndex) {
    requestAnimationFrame(draw);
  }
}

paramConfig.addListener(
  ({ width, height }) => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    lastRun = new Date().getTime();
    maze = new Array(height).fill().map(() => new Array(width).fill(-1));
    toExpand = [[Math.floor(height / 2), Math.floor(width / 2)]];
    maze[toExpand[0][0]][toExpand[0][1]] = 0;
    startIndex = iterations = maxStackSize = 0;
    endIndex = 1;
    emptyCellsCount = width * height - 1;
    drawCell(toExpand[0]);

    draw();
  },
  ["width", "height", "reset"]
);

window.resizeCallback = function () {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  maze?.forEach((row, y) =>
    row.forEach((val, x) => val >= 0 && drawCell([y, x]))
  );
};
