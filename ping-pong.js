const CANVAS = document.getElementById("canvas");

const GAME_SETTINGS = {
  targetFps: 60,
  wallColor: "#202020",
  wallSize: 20,
  courtMarginX: 12,
  ballRadius: 8,
  buttonColor: "#111",
  buttonTextColor: "#eee",
  courtMarginY: 5,
  winScore: 7,
  playerOneColor: "red",
  playerTwoColor: "blue",
  smallFont: "16px Arial",
  largeFont: "20px Arial",
  scoreTextColor: "#eee",
  paddleWidth: 12,
  paddleHeight: 48,
  getIntervalLength: function () {
    return 1.0 / this.targetFps;
  },
};

const playerIndex = {
  playerOne: 1,
  playerTwo: 2,
};

class PingPongGame {
  constructor(canvas) {
    this._table = new Table(canvas);
    this._canvas = canvas;
    this._startButtonRect = new Rectangle(
      canvas.width / 2 - 60,
      canvas.height / 2 - 20,
      120,
      40
    );
    let that = this;

    this._canvas.addEventListener("click", function (e) {
      let canvasBounds = canvas.getBoundingClientRect();

      let mouseX = e.clientX - canvasBounds.left;
      let mouseY = e.clientY - canvasBounds.top;

      if (
        that._startButtonRect.contain(mouseX, mouseY) &&
        !that._table.isMatchRunning
      ) {
        that._table.startMatch();
      }
    });

    document.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Space") && !that._table.isMatchRunning) {
        that._table.startMatch();
      }
    });
  }

  draw() {
    let ctx = this._canvas.getContext("2d");
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._table.draw(this._canvas);

    if (!this._table.isMatchRunning) {
      ctx.fillStyle = GAME_SETTINGS.buttonColor;
      ctx.fillRect(
        this._startButtonRect.x,
        this._startButtonRect.y,
        this._startButtonRect.width,
        this._startButtonRect.height
      );
      ctx.fillStyle = GAME_SETTINGS.buttonTextColor;
      ctx.font = GAME_SETTINGS.smallFont;
      ctx.fillText(
        "Start Match",
        this._startButtonRect.x + 20,
        this._startButtonRect.y + this._startButtonRect.height / 2 + 6
      );
    }
  }
  _update(deltaTime) {
    this._table.update(deltaTime);
  }

  run() {
    // console.log("inside run");
    this._canvas.style.display = "block";
    let that = this;
    let prevUpdateTime = Date.now();
    setInterval(function () {
      let updateTime = Date.now();
      let deltaTime = (updateTime - prevUpdateTime) / 1000.0;
      that._update(deltaTime);
      that.draw();
      prevUpdateTime = updateTime;
    }, GAME_SETTINGS.getIntervalLength() * 1000);
  }
}

class Table {
  constructor(canvas) {
    this._canvas = canvas;
    this._leftPaddle = new Paddle(
      GAME_SETTINGS.paddleWidth,
      canvas.height / 2 - GAME_SETTINGS.paddleHeight / 2,
      GAME_SETTINGS.paddleWidth,
      GAME_SETTINGS.paddleHeight,
      playerIndex.playerOne,
      this
    );

    this._rightPaddle = new Paddle(
      canvas.width - GAME_SETTINGS.paddleWidth - 12,
      canvas.height / 2 - GAME_SETTINGS.paddleHeight / 2,
      GAME_SETTINGS.paddleWidth,
      GAME_SETTINGS.paddleHeight,
      playerIndex.playerTwo,
      this
    );
    this._playerController = new PlayerPaddleController(this._leftPaddle);
    this._ball = new Ball(
      GAME_SETTINGS.ballRadius,
      canvas.width / 2,
      canvas.height / 2,
      this
    );

    this._cpuController = new CpuPaddleController(
      this._rightPaddle,
      this._ball
    );
    this._isMatchRunning = false;
    this._scoreBoard = new ScoreBoard();
  }

  get leftPaddle() {
    return this._leftPaddle;
  }
  get rightPaddle() {
    return this._rightPaddle;
  }

  get isMatchRunning() {
    return this._isMatchRunning;
  }

  get bounds() {
    return {
      upper: GAME_SETTINGS.courtMarginY + GAME_SETTINGS.wallSize,
      lower:
        this._canvas.height -
        (GAME_SETTINGS.courtMarginY + GAME_SETTINGS.wallSize),
      left: 0,
      right: this._canvas.width,
    };
  }
  update(deltaTime) {
    if (!this._isMatchRunning) return;

    this._playerController.update(deltaTime);
    this._cpuController.update(deltaTime);
    this._ball.update(deltaTime);
  }

  draw(canvas) {
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = GAME_SETTINGS.wallColor;
    ctx.fillRect(
      0,
      GAME_SETTINGS.courtMarginY,
      this._canvas.width,
      GAME_SETTINGS.wallSize
    );

    ctx.fillRect(
      0,
      this._canvas.height - GAME_SETTINGS.courtMarginY - GAME_SETTINGS.wallSize,
      this._canvas.width,
      GAME_SETTINGS.wallSize
    );

    this._leftPaddle.draw(canvas);
    this._rightPaddle.draw(canvas);
    this._ball.draw(canvas);
    this._scoreBoard.draw(canvas);
  }
  startMatch() {
    this._isMatchRunning = true;
    this._spawnBall();
    this._scoreBoard.reset();
    this._scoreBoard.round = 1;
    this._leftPaddle.reset();
    this._rightPaddle.reset();
  }

  _spawnBall() {
    this._ball.velocity = {
      x: Math.random() > 0.5 ? 1 : -1,
      y: Math.random() > 0.5 ? 1 : -1,
    };

    this._ball.posX = this._canvas.width / 2;
    this._ball.posY = this._canvas.height / 2;
    this._ball.speed = Ball.minSpeed;
  }
  scorePoint(playerIndex) {
    if (playerIndex == playerIndex.playerOne) {
      this._scoreBoard.playerOneScore++;
    } else {
      this._scoreBoard.playerTwoScore++;
    }

    if (this._scoreBoard.winner) {
      this._isMatchRunning = false;
    } else {
      this._scoreBoard.round++;
      this._spawnBall();
    }
  }
}

class PlayerPaddleController {
  constructor(paddle) {
    this._paddle = paddle;

    this._isUpKeyPressed = false;
    this._isDownKeyPressed = false;

    let that = this;
    document.addEventListener("keydown", function (e) {
      if (e.key == "ArrowUp" || e.key == "w") {
        that._isUpKeyPressed = true;
      } else if (e.key == "ArrowDown" || e.key == "s") {
        that._isDownKeyPressed = true;
      }
    });

    document.addEventListener("keyup", function (e) {
      if (e.key == "ArrowUp" || e.key == "w") {
        that._isUpKeyPressed = false;
      } else if (e.key == "ArrowDown" || e.key == "s") {
        that._isDownKeyPressed = false;
      }
    });
  }
  get velocityY() {
    let velocityY = 0;
    if (this._isUpKeyPressed) velocityY -= 1;
    if (this._isDownKeyPressed) velocityY += 1;

    return velocityY;
  }

  update(deltaTime) {
    if (this.velocityY > 0) this._paddle.moveDown(deltaTime);
    else if (this.velocityY < 0) this._paddle.moveUp(deltaTime);
  }
}
class Paddle {
  constructor(posX, posY, width, height, playerIndex, table) {
    this.posX = posX;
    this.posY = posY;
    this.width = width;
    this.height = height;
    this._playerIndex = playerIndex;
    this._table = table;
    this._startPosX = posX;
    this._startPosY = posY;
  }

  static get speed() {
    return 150;
  }

  get collisionBox() {
    return new Rectangle(this.posX, this.posY, this.width, this.height);
  }

  draw(canvas) {
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = this.renderColor;
    ctx.fillRect(this.posX, this.posY, this.width, this.height);
  }

  get renderColor() {
    return this._playerIndex == playerIndex.playerOne
      ? GAME_SETTINGS.playerOneColor
      : GAME_SETTINGS.playerTwoColor;
  }

  moveUp(deltaTime) {
    this.posY -= Paddle.speed * deltaTime;

    if (this.posY < this._table.bounds.upper) {
      this.posY = this._table.bounds.upper;
    }
  }
  moveDown(deltaTime) {
    this.posY += Paddle.speed * deltaTime;

    if (this.posY + this.height > this._table.bounds.lower) {
      this.posY = this._table.bounds.lower - this.height;
    }
  }

  reset() {
    this.posX = this._startPosX;
    this.posY = this._startPosY;
  }
}

class Ball {
  constructor(radius, posX, posY, table) {
    this.posX = posX;
    this.posY = posY;
    this.radius = radius;
    this._velocity = {
      x: 0,
      y: 0,
    };
    this._table = table;
    this._speed = Ball.minSpeed;
  }

  static get minSpeed() {
    return 100;
  }
  static get maxSpeed() {
    return 300;
  }
  static get acceleration() {
    return 2;
  }
  get speed() {
    return this._speed;
  }
  set speed(val) {
    if (val < Ball.minSpeed) {
      val = Ball.minSpeed;
    } else if (val > Ball.maxSpeed) {
      val = Ball.maxSpeed;
    }

    this._speed = val;
  }

  get normalizedSpeed() {
    return (this._speed - Ball.minSpeed) / (Ball.maxSpeed - Ball.minSpeed);
  }

  get collisionBox() {
    return new Rectangle(
      this.posX - this.radius,
      this.posY - this.radius,
      this.radius * 2,
      this.radius * 2
    );
  }
  get velocity() {
    return this._velocity;
  }
  set velocity(val) {
    this._velocity = val;
  }

  update(deltaTime) {
    this.posY += Math.sign(this.velocity.y) * this.speed * deltaTime;

    if (this.posY - this.radius < this._table.bounds.upper) {
      this.posY = this._table.bounds.upper + this.radius;
      this.velocity.y *= -1;
    } else if (this.posY + this.radius > this._table.bounds.lower) {
      this.posY = this._table.bounds.lower - this.radius;
      this.velocity.y *= -1;
    }

    if (this.collisionBox.overLaps(this._table.leftPaddle.collisionBox)) {
      this.velocity.x *= -1;
      this.posX = this._table.leftPaddle.collisionBox.right + this.radius;
    }

    if (this.collisionBox.overLaps(this._table.rightPaddle.collisionBox)) {
      this.velocity.x *= -1;
      this.posX = this._table.rightPaddle.collisionBox.left - this.radius;
    }

    this.posX += Math.sign(this.velocity.x) * this.speed * deltaTime;

    if (this.posX < this._table.bounds.left)
      this._table.scorePoint(playerIndex.playerTwo);
    else if (this.posX > this._table.bounds.right)
      this._table.scorePoint(playerIndex.playerOne);

    this.speed += Ball.acceleration * deltaTime;
  }

  draw(canvas) {
    let ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(this.posX, this.posY, this.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = "white";
    ctx.fill();
  }
}

class CpuPaddleController {
  constructor(paddle, ball) {
    this._paddle = paddle;
    this._ball = ball;
  }

  static get predictionDistanceMax() {
    return 400.0;
  }

  static get predictionDistanceMin() {
    return 20.0;
  }
  static get errorMarginMax() {
    return 0.5;
  }

  _calculateErrorMargin() {
    return CpuPaddleController.errorMarginMax * this._ball.normalizedSpeed;
  }

  _getBallDistance() {
    return Math.abs(this._paddle.posX - this._ball.posX);
  }

  _getBallPredictionChance() {
    let distance =
      this._getBallDistance() - CpuPaddleController.predictionDistanceMin;
    let errorMargin = this._calculateErrorMargin();
    return (
      1.0 - distance / CpuPaddleController.predictionDistanceMax - errorMargin
    );
  }

  update(deltaTime) {
    let rng = Math.random();
    let predictChance = this._getBallPredictionChance();

    let ballDeltaY = Math.sign(
      this._paddle.posY - this._ball.posY + this._paddle.height / 2
    );

    if (rng <= predictChance) {
      if (ballDeltaY > 0) {
        this._paddle.moveUp(deltaTime);
      } else {
        this._paddle.moveDown(deltaTime);
      }
    } else {
      rng = Math.random();
      if (rng < 0.2) {
        if (ballDeltaY > 0) {
          this._paddle.moveDown(deltaTime);
        } else {
          this._paddle.moveUp(deltaTime);
        }
      }
    }
  }
}

class ScoreBoard {
  constructor() {
    this.reset();
  }

  get winner() {
    if (this.playerOneScore >= GAME_SETTINGS.winScore) {
      return playerIndex.playerOne;
    } else if (this.playerTwoScore >= GAME_SETTINGS.winScore) {
      return playerIndex.playerTwo;
    }

    return 0;
  }

  draw(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.font = GAME_SETTINGS.smallFont;
    ctx.fillStyle = GAME_SETTINGS.scoreTextColor;

    ctx.fillText("Red Player | " + this.playerOneScore, 8, 20);
    ctx.fillText(
      this.playerTwoScore + " | Blue Player",
      canvas.width - 115,
      20
    );

    ctx.fillText("Round: " + this.round, canvas.width / 2 - 50, 20);

    if (this.winner) {
      let winnerName =
        this.winner == playerIndex.playerOne ? "Red Player" : "Blue Player";

      ctx.font = GAME_SETTINGS.largeFont;
      ctx.fillStyle = "#eee";
      ctx.fillText(winnerName + " wins!", canvas.width / 2 - 75, 60);
    }
  }

  reset() {
    this.playerOneScore = 0;
    this.playerTwoScore = 0;
    this.round = 0;
  }
}
class Rectangle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get left() {
    return this.x;
  }
  get right() {
    return this.x + this.width;
  }
  get top() {
    return this.y;
  }
  get bottom() {
    return this.y + this.height;
  }

  overLaps(other) {
    return (
      other.left < this.right &&
      this.left < other.right &&
      other.top < this.bottom &&
      this.top < other.bottom
    );
  }

  contain(x, y) {
    return this.left < x && this.right > x && this.top < y && this.bottom > y;
  }
}

let game = new PingPongGame(CANVAS);

function startGame() {
  // console.log("game started");
  document.getElementById("btn-start").style.display = "none";
  game.run();
}
