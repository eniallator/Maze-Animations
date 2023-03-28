ctx.fillStyle = "black";
ctx.strokeStyle = "white";

let toExpand,
  startIndex,
  endIndex,
  maze,
  iterations,
  maxStackSize,
  emptyCellsCount,
  templateImgEl,
  templateData;

const templateCellEmpty = (x, y) => {
  return (
    templateData == null ||
    new Array(templateData.colorSpace.length)
      .fill()
      .map(
        (_, offset) =>
          templateData.colorSpace.length * (y * templateData.height + x) +
          offset
      )
      .every((i) => templateData.data[i] === 0)
  );
};

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
      .filter(
        ([y, x]) => (maze[y]?.[x] ?? 0) === -1 && templateCellEmpty(x, y)
      );

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
  ctx.fillStyle = `hsl(${
    (maze[y][x] / paramConfig.getVal("colour-cycle-freq")) % 360
  }, 100%, 50%)`;
  const width = templateData?.width ?? paramConfig.getVal("width");
  const height = templateData?.height ?? paramConfig.getVal("height");
  const cellWidth = canvas.width / width;
  const cellHeight = canvas.height / height;
  ctx.fillRect(
    Math.round(x * cellWidth),
    Math.round(y * cellHeight),
    Math.ceil(cellWidth),
    Math.ceil(cellHeight)
  );
}

let startTime, lastRun;
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
  $("#time-taken").text(`${(now - startTime) / 1000} sec`);
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

  if (endIndex > startIndex) {
    requestAnimationFrame(draw);
  }
}

const resetMaze = (width, height) => {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (templateData) {
    ctx.drawImage(templateImgEl, 0, 0, canvas.width, canvas.height);
    let closestCell, closestDist;
    maze = new Array(height).fill().map((_, y) =>
      new Array(width).fill().map((_, x) => {
        let dist = (y - height / 2) ** 2 + (x - width / 2) ** 2;
        if (
          templateCellEmpty(x, y) &&
          (closestCell == null || dist < closestDist)
        ) {
          closestCell = [y, x];
          closestDist = dist;
        }
        return -1;
      })
    );
    if (closestCell != null) {
      toExpand = [closestCell];
    }
  } else {
    toExpand = [[Math.floor(height / 2), Math.floor(width / 2)]];
    maze = new Array(height).fill().map(() => new Array(width).fill(-1));
  }

  startTime = lastRun = new Date().getTime();
  maze[toExpand[0][0]][toExpand[0][1]] = 0;
  startIndex = iterations = maxStackSize = 0;
  endIndex = 1;
  emptyCellsCount = width * height - 1;
  drawCell(toExpand[0]);

  draw();
};

paramConfig.addListener(
  ({ width, height, "template-image": templateImage }) => {
    if (templateImage == null) {
      resetMaze(width, height);
    }
  },
  ["width", "height", "reset"]
);

paramConfig.addListener(
  ({ "template-image": templateImage }) => {
    if (templateImage != null) {
      new Promise((res, rej) => {
        const imgCanvas = document.createElement("canvas");
        const imgCtx = imgCanvas.getContext("2d");
        templateImgEl = new Image();
        templateImgEl.addEventListener("load", () => {
          imgCanvas.width = templateImgEl.width;
          imgCanvas.height = templateImgEl.height;
          imgCtx.drawImage(
            templateImgEl,
            0,
            0,
            templateImgEl.width,
            templateImgEl.height
          );
          res(
            imgCtx.getImageData(0, 0, templateImgEl.width, templateImgEl.height)
          );
        });
        templateImgEl.src = templateImage;
      }).then((data) => {
        templateData = data;
        resetMaze(data.width, data.height);
      });
    }
  },
  ["template-image", "reset"]
);

window.resizeCallback = function () {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  maze?.forEach((row, y) =>
    row.forEach((val, x) => val >= 0 && drawCell([y, x]))
  );
};
