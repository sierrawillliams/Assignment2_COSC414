var canvas = document.getElementById("bugs");         // retrieve canvas element

canvas.width = window.innerWidth * 0.8;               // fills the screen
canvas.height = window.innerHeight * 0.8;             // fills the screen

let aspectRatio = canvas.width / canvas.height;

var ctx = canvas.getContext("webgl");                // rendering context
var prog = ctx.createProgram();                     // creating the rendering

var positionAttribLocation;                         // position of attribute
var u_FragColor;
var scalerAttribLocation;
var triangleVertexBuffer;                           // vertex buffer

var vertexCount = 100;                               // how many vertices on circle for bacteria to pop up on
var pRadius = 0.01;                                 // radius of the poison
var pgRate = 0.001;                                 // growth rate of the poison

let gRate = 0.0005;                                 // how fast the bacteria grows
let radius = 0.8;                                   // radius of inner circle

let circleSpace = 0.03;                             // space between bacteria
let circleRadius = 0.05;                            // radius of bacteria

let complexity = 128;                               
let scaler = 1.2;                                   

// initialize vertices
var triangleVertices = init_vertices(
  0,
  0,
  radius,
  vertexCount,
  aspectRatio
);

// initialize vertices
var circleVertices = init_vertices(
  0,
  0,
  radius / 3,
  vertexCount,
  aspectRatio
);

var maxBac = 20;                                    // maximum number of bacteria
let max = 2;                                        // max threshold
var time = 0;                                       // elapsed time
var timer = 0;                                      // timer count
var score = 0;                                      // score count

var poisons = [];                                   // poison array

// vertex shader program
var vertexShaderText = [
  "precision mediump float;",                      // precision qualifier
  "attribute vec2 vertPosition;",

  "void main()",
  "{",
  "	gl_Position = vec4(vertPosition,0.0,1.0);",   // coordinates
  "	gl_PointSize = 5.0;",                         // set point size
  "}",
].join("\n");

// fragment shader program
var fragmentShaderText = [
  "precision mediump float;",                     // precision qualifier
  "uniform vec4 f_colour;",                         // specifies position of a vertex
  "void main()",
  "{",

  "	gl_FragColor = f_colour;",
  "}",
].join("\n");

// make poison circle
function generatePoison(x, y) {
  const clampf = (r, g, b, a) => [r / 255, g / 255, b / 255, a];
  let rgba = clampf(1.0, 1.0, 1.0, 1.0);

  var vBuffer = ctx.createBuffer();
  var fBuffer = ctx.createBuffer();

  // circle 
  poisons.push({
    x: x,
    y: y,

    r: rgba[0],
    g: rgba[1],
    b: rgba[2],
    a: rgba[3],

    radius: pRadius,
    vBuffer: vBuffer,
    fBuffer: fBuffer,
  });
}

function drawPoison() {
  var deleted = [];

  for (var i = 0; i < poisons.length; i++) {
    if (poisons[i].radius >= (radius * 1) / 6) {
      deleted.push(i);
      continue;
    }
    drawCircle(poisons[i], ctx.POINTS);

    poisons[i].g = 1.0;
  }

  for (var x = 0; x < deleted.length; x++) poisons.splice(x, 1);
}

// all circles to be drawn
const circleMap = new Map();

function makeCircle() {
  // find spot to draw Circle
  let x = 0,
    y = 0,
    theta = 0;

  let counter = 0;

  while (true) {
    let okCircle = true;

    theta = Math.floor(Math.random() * 360) + 1;
    x = (radius * Math.cos((2 * Math.PI * theta) / 360)) / aspectRatio;
    y = radius * Math.sin((2 * Math.PI * theta) / 360);

    for (const [key, value] of circleMap.entries()) {
      let dX = value.x - x;
      let dY = value.y - y;
      let distance = Math.sqrt(dX * dX + dY * dY);

      if (distance < value.radius + circleRadius + circleSpace) {
        okCircle = false;
        break;
      }
    }
    if (okCircle) break;
    counter++;

    if (counter >= 10) {
      break;
    }
  }
  // circle colour
  let rgbInt = GenerateColor();

  // buffer id
  let rgbStr = "" + rgbInt[0] + rgbInt[1] + rgbInt[2];

  // generate colours until unique
  while (circleMap.has(rgbStr)) {
    rgbInt = GenerateColor();
    rgbStr = "" + rgbInt[0] + rgbInt[1] + rgbInt[2];
    counter++;

    if (counter >= 10) {
      break;
    }
  }

  const clampf = (r, g, b, a) => [r / 255, g / 255, b / 255, a];
  let rgba = clampf(rgbInt[0], rgbInt[1], rgbInt[2], 1.0); // debug

  // circle buffer
  var vBuffer = ctx.createBuffer();
  var fBuffer = ctx.createBuffer();

  // circle
  return [
    rgbStr,
    {
      x: x,
      y: y,

      r: rgba[0],
      g: rgba[1],
      b: rgba[2],
      a: rgba[3],

      radius: circleRadius,
      vBuffer: vBuffer,
      fBuffer: fBuffer,
    },
  ];
}

// random colour 
function GenerateColor() {
  let rgbVal = new Float32Array(3);                             // 32-bit floating point number (float)

  for (let i = 0; i < 3; i++) {

    let vals = Math.floor(Math.random() * 154) + 100;

    rgbVal[i] = vals;
  }
  return rgbVal;
}

// score
var scores = document.getElementById("score");

var Start = function () {
  // initialize WebGL
  if (!ctx) {
    console.log("WebGL not supported");
    ctx = canvas.getContext("experimental-webgl", {
      preserveDrawingBuffer: true,
    });
  }

  if (!ctx) {
    alert("Your browser does not support webgl");
  }

  // set window size
  ctx.viewport(0, 0, canvas.width, canvas.height);

  // create shader
  var vShader = ctx.createShader(ctx.VERTEX_SHADER);
  var fShader = ctx.createShader(ctx.FRAGMENT_SHADER);

  ctx.shaderSource(vShader, vertexShaderText);
  ctx.shaderSource(fShader, fragmentShaderText);

  // compile shader
  ctx.compileShader(vShader);

  if (!ctx.getShaderParameter(vShader, ctx.COMPILE_STATUS)) {
    console.error(
      "Error compiling",
      ctx.getShaderInfoLog(vShader)
    );
    return;
  }

  ctx.compileShader(fShader);

  if (!ctx.getShaderParameter(fShader, ctx.COMPILE_STATUS)) {
    console.error(
      "Error compiling",
      ctx.getShaderInfoLog(fShader)
    );
    return;

  }

  ctx.attachShader(prog, vShader);
  ctx.attachShader(prog, fShader);
  ctx.linkProgram(prog);

  if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) {
    console.error("Error linking", ctx.getProgramInfo(prog));
    return;
  }

  ctx.useProgram(prog);

  positionAttribLocation = ctx.getAttribLocation(prog, "vertPosition");   // retrieve storage location of attribute variable
  u_FragColor = ctx.getUniformLocation(prog, "f_colour");                 // retrieve storage location of f_color

  // first circles
  for (let i = 0; i < 5; i++) {
    spawnBacteria();
  }

  // vertex buffer
  triangleVertexBuffer = ctx.createBuffer();
};

// initialize vertices
function init_vertices(x, y, radius, numSides) {
  let origin = {x, y};
  let pi = Math.PI;

  x = new Float32Array(numSides * 2);                           // 32-bit floating point number (float)
  y = new Float32Array(numSides * 2);                           // 32-bit floating point number (float)
  verts = new Float32Array(numSides * 4);                       // 32-bit floating point number (float

  // each vertex
  for (let i = 0; i < numSides * 2; i++) {
    x[i] =(origin.x + radius * Math.cos((2 * pi * i) / numSides)) / aspectRatio;
    y[i] = origin.y + radius * Math.sin((2 * pi * i) / numSides);
  }

  for (let i = 0; i <= numSides; i += 2) {
    verts[i] = x[i];
    verts[i + 1] = y[i];
  }
  return verts;
}

function Draw() {
  // bind buffer object to target
  ctx.bindBuffer(ctx.ARRAY_BUFFER, triangleVertexBuffer);
  // write data into the buffer object
  ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(triangleVertices), ctx.STATIC_DRAW);
  // assign the buffer object to positionAttribLocation variable
  ctx.vertexAttribPointer(
    positionAttribLocation, 
    2, 
    ctx.FLOAT,
    ctx.FALSE,
    2 * Float32Array.BYTES_PER_ELEMENT,                         // number of bytes per element in the array
    0 * Float32Array.BYTES_PER_ELEMENT);                        // number of bytes per element in the array
  // enable the assignment to positionAttribLocation variable
  ctx.enableVertexAttribArray(positionAttribLocation);
  // pass the colour of a point to u_FragColor
  ctx.uniform4f(u_FragColor, 1.0, 1.0, 1.0, 1);
  // draw
  ctx.drawArrays(ctx.TRIANGLE_FAN, 0, vertexCount);
  // write data into the buffer object
  ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(circleVertices), ctx.STATIC_DRAW);
  // assign the buffer object to positionAttribLocation variable
  ctx.vertexAttribPointer(
    positionAttribLocation,
    2, 
    ctx.FLOAT,
    ctx.FALSE,
    2 * Float32Array.BYTES_PER_ELEMENT,                         // number of bytes per element in the array
    0 * Float32Array.BYTES_PER_ELEMENT);                        // number of bytes per element in the array
  // enable the assignment to positionAttribLocation variable
  ctx.enableVertexAttribArray(positionAttribLocation);
  // pass the colour of a point to u_FragColor
  ctx.uniform4f(u_FragColor, 1.0, 1.0, 0.0, 1);
  // draw
  ctx.drawArrays(ctx.TRIANGLE_FAN, 0, vertexCount);
}

function drawCircle(circle, drawType) {
  x = new Float32Array(vertexCount * 2);
  y = new Float32Array(vertexCount * 2);
  verts = new Float32Array(vertexCount * 4);

  // each vertex
  for (let i = 0; i < vertexCount * 2; i++) {
    x[i] = circle.x + (circle.radius / aspectRatio) * Math.cos((2 * Math.PI * i) / vertexCount);
    y[i] = circle.y + circle.radius * Math.sin((2 * Math.PI * i) / vertexCount);
  }

  for (let i = 0; i <= vertexCount; i += 2) {
    verts[i] = x[i];
    verts[i + 1] = y[i];
  }

  // bind buffer object to target
  ctx.bindBuffer(ctx.ARRAY_BUFFER, circle.vBuffer);
  // write data into the buffer object
  ctx.bufferData(ctx.ARRAY_BUFFER, verts, ctx.DYNAMIC_DRAW);
  // assign the buffer object to positionAttribLocation variable
  ctx.vertexAttribPointer(
    positionAttribLocation,                                     // location
    2,                                                          // elements per attribute
    ctx.FLOAT,
    ctx.FALSE,
    2 * Float32Array.BYTES_PER_ELEMENT,                         // number of bytes per element in the array
    0 * Float32Array.BYTES_PER_ELEMENT);                        // number of bytes per element in the array
  // enable the assignment to positionAttribLocation variable
  ctx.enableVertexAttribArray(positionAttribLocation);
  // pass the colour of a point to u_FragColor
  ctx.uniform4f(u_FragColor, circle.r, circle.g, circle.b, circle.a);
  // draw
  ctx.drawArrays(drawType, 0, vertexCount);
}

// loop
var loop = function () {
  Draw();
  drawCircleArray();
  drawPoison();

  scores.innerHTML = "Score: " + score;

  // bacteria hit poison = lose
  if (max <= 0) {
    alert("You lose");
  }

  // register function (event handler) to be called on a mouse press
  canvas.onmousedown = function (event) {
	// draw circles 
    drawCircleArray();

	// colours
    var pix = new Uint8Array(4 * ctx.drawingBufferWidth * ctx.drawingBufferHeight);

    ctx.readPixels(
      0,
      0,
      ctx.drawingBufferWidth,
      ctx.drawingBufferHeight,
      ctx.RGBA,
      ctx.UNSIGNED_BYTE,
      pix
    );

    var rect = event.target.getBoundingClientRect();

    x = event.clientX - rect.left;
    y = rect.bottom - event.clientY;

    var pixelR = pix[4 * (y * ctx.drawingBufferWidth + x)];
    var pixelG = pix[4 * (y * ctx.drawingBufferWidth + x) + 1];
    var pixelB = pix[4 * (y * ctx.drawingBufferWidth + x) + 2];
    var pixelA = pix[4 * (y * ctx.drawingBufferWidth + x) + 3];
    var rgbStr = "" + pixelR + pixelG + pixelB;

    // colour matches id
    if (circleMap.has(rgbStr)) {
      circleMap.delete(rgbStr);
      if (score == 9) {                            // score = 10
        score = 10;

        alert("You win");                         // you won!
      } else {
        score++;                                  // score+1

        spawnBacteria();                          // bacteria created where last was

        var mx = event.clientX,

        my = event.clientY;
        mx = mx / canvas.width - 0.5;
        my = my / canvas.height - 0.5;
        mx = mx * 2;
        my = my * -2;

        generatePoison(mx, my);                  
      }
    }
  };
  requestAnimationFrame(loop);                    // request that the browser calls loop
};
requestAnimationFrame(loop);                      // request that the browser calls loop

// create bacteria
function drawCircleArray() {
  // if bacteria touches poison remove it
  for (const [key1, circle1] of circleMap.entries()) {
    for (let i = 0; i < poisons.length; i++) {
      let X = (circle1.x - poisons[i].x) * 1.1;
      let Y = (circle1.y - poisons[i].y) * 1.1;
      let distance = Math.sqrt(X * X + Y * Y);

      if (distance < circle1.radius + poisons[i].radius) {
        circleMap.delete(key1);
        continue;
      }
    }
	// check for bacteria touching
    for (const [key2, circle2] of circleMap.entries()) {
      if (key1 === key2) continue;

      let dX = (circle1.x - circle2.x) * 1.1;
      let dY = (circle1.y - circle2.y) * 1.1;
      let distance = Math.sqrt(dX * dX + dY * dY);

      var newRadius = Math.sqrt(Math.pow(circle1.radius, 2), Math.pow(circle2.radius, 2));

	  // if bacteria touches eachother, delete smaller
      if (distance < circle1.radius + circle2.radius) {
        if (circle1.radius > circle2.radius) {
          circleMap.get(key1).radius *= 1.5;
          circleMap.delete(key2);
        } else {
          circleMap.get(key2).radius *= 1.5;
          circleMap.delete(key1);
        }
      }
    }
  }

  // bacteria touches poison
  for (const [key, value] of circleMap.entries()) {
    value.radius = value.radius + gRate;
    if (value.radius >= ((radius * 2) / 3) * 1.0) {
	  // delete bacteria
      max--;
      circleMap.delete(key);

      let circle = makeCircle();

      circleMap.set(circle[0], circle[1]);
    }
    drawCircle(value, ctx.TRIANGLE_FAN);
  }
}

// create new bacteria
function spawnBacteria() {
  let circle = makeCircle();

  circleMap.set(circle[0], circle[1]);
}