let video;
let captureBtn; // 宣告拍照按鈕變數
let faceMesh;
let faces = [];
let msgWebGL = "WebGL 檢查中...";
let msgModel = "ml5 模型載入中...";

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 設定視訊參數，針對手機優化 (指定前置鏡頭，並關閉音訊)
  let constraints = {
    audio: false,
    video: {
      facingMode: "user" // 若要用後置鏡頭，請改為 "environment"
    }
  };

  video = createCapture(constraints);
  video.hide(); // 隱藏預設的 HTML 影片元素，僅將畫面繪製在畫布上
  imageMode(CENTER);
  
  // 檢查手機是否支援 WebGL
  let hasWebGL = checkWebGL();
  msgWebGL = hasWebGL ? "WebGL 支援：成功" : "WebGL 支援：失敗 (手機可能不支援或效能受限)";

  // 載入 ml5.js 臉部辨識模型
  try {
    faceMesh = ml5.faceMesh(video, () => {
      msgModel = "ml5 模型載入：成功";
    });
    faceMesh.detectStart(video, results => {
      faces = results;
    });
  } catch (e) {
    msgModel = "ml5 模型載入：失敗 (" + e.message + ")";
  }

  // 在視訊畫面外（畫面左上角）產生一個按鈕
  captureBtn = createButton('擷取並儲存圖片');
  captureBtn.position(20, 110); 
  captureBtn.mousePressed(saveVideoFrame); // 綁定點擊事件
}

function draw() {
  background('#e7c6ff');
  
  // 顯示指定的置中文字
  fill(0);
  noStroke();
  textSize(32);
  textAlign(CENTER, BOTTOM);
  
  let drawW = width * 0.5;
  let drawH = height * 0.5;
  
  // 文字位置在視訊畫面上方 (不被縮放或翻轉影響)
  let textY = (height / 2) - (drawH / 2) - 20; 
  text("411730046", width / 2, textY);

  // 顯示狀態與除錯訊息
  textSize(16);
  textAlign(LEFT, TOP);
  fill(50);
  text(msgWebGL, 20, 60);
  text(msgModel, 20, 85);
  
  // 由於影像需做左右顛倒，我們使用 push/pop 來做座標變換
  push();
  translate(width / 2, height / 2); // 將原點移至畫布中心
  scale(-1, 1); // 左右顛倒處理
  
  // 1. 繪製底層視訊畫面 (顯示的影像寬高為整個畫布寬高的 50%)
  image(video, 0, 0, drawW, drawH);
  
  // 2. 解析並繪製臉部網格線條
  if (video.width > 0 && faces.length > 0) {
    // 提前定義臉部輪廓節點
    let faceOutline = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

    // 繪製充滿整個輪廓外的背景，顏色為 fdf0d5
    fill('#fdf0d5');
    noStroke();
    beginShape();
    // 外層邊界 (順時針繪製，極值涵蓋整個畫布)
    vertex(-width, -height);
    vertex(width, -height);
    vertex(width, height);
    vertex(-width, height);
    
    // 將每一個偵測到的臉部範圍挖空
    for (let face of faces) {
      beginContour();
      // 內層挖洞 (利用迴圈倒序，以逆時針繪製臉部輪廓點位)
      for (let i = faceOutline.length - 1; i >= 0; i--) {
        let p = getMappedPos(face.keypoints[faceOutline[i]].x, face.keypoints[faceOutline[i]].y, drawW, drawH);
        vertex(p.x, p.y);
      }
      endContour();
    }
    endShape(CLOSE);

    for (let face of faces) {
      // 嘴唇外圍
      let lipsOuter = [409, 270, 269, 267, 0, 37, 39, 40, 185, 61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
      drawFeature(face, lipsOuter, color(255, 0, 0), 1);
      
      // 嘴唇內圈
      let lipsInner = [76, 77, 90, 180, 85, 16, 315, 404, 320, 307, 306, 408, 304, 303, 302, 11, 72, 73, 74, 184];
      drawFeature(face, lipsInner, color(255, 0, 0), 1);

      // 右眼 (包含外圍與內圈，並涵蓋指定的 246, 247)
      let rightEyeOuter = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
      let rightEyeInner = [130, 25, 110, 24, 23, 22, 26, 112, 243, 190, 56, 28, 27, 29, 113, 247];
      drawFeature(face, rightEyeOuter, color(60, 60, 60, 200), 15); // 灰黑色，加入一點透明度讓黑眼圈更自然
      drawFeature(face, rightEyeInner, color(0, 255, 0), 1);
      
      // 左眼
      let leftEyeOuter = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
      let leftEyeInner = [359, 255, 339, 254, 253, 252, 256, 341, 463, 414, 286, 258, 257, 259, 342, 467];
      drawFeature(face, leftEyeOuter, color(60, 60, 60, 200), 15); // 灰黑色，加入一點透明度讓黑眼圈更自然
      drawFeature(face, leftEyeInner, color(0, 255, 0), 1);

      // 臉部輪廓
      drawFeature(face, faceOutline, color(0, 255, 255), 2); // 改為明顯的螢光藍色
    }
  }
  
  pop();
}

// WebGL 檢查函式
function checkWebGL() {
  try {
    let canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// 將攝影機的影像座標，轉換至畫布中心 (-drawW/2 到 drawW/2) 的相對位置 (增加防呆支援)
function getMappedPos(kp, drawW, drawH) {
  if (!kp) return { x: 0, y: 0 };
  // 兼容不同的 keypoint 結構 ({x, y} 或是陣列 [x, y])
  let kx = kp.x !== undefined ? kp.x : kp[0];
  let ky = kp.y !== undefined ? kp.y : kp[1];
  let x = (kx - video.width / 2) * (drawW / video.width);
  let y = (ky - video.height / 2) * (drawH / video.height);
  return { x, y };
}

// 繪製相連的特徵線條，並將頭尾相連
function drawFeature(face, indices, c, weight) {
  stroke(c);
  strokeWeight(weight);
  noFill();
  
  let drawW = width * 0.5;
  let drawH = height * 0.5;

  for (let i = 0; i < indices.length - 1; i++) {
    let p1 = getMappedPos(face.keypoints[indices[i]], drawW, drawH);
    let p2 = getMappedPos(face.keypoints[indices[i + 1]], drawW, drawH);
    line(p1.x, p1.y, p2.x, p2.y);
  }
  
  // 將最後一點與第一點連起來
  let pLast = getMappedPos(face.keypoints[indices[indices.length - 1]], drawW, drawH);
  let pFirst = getMappedPos(face.keypoints[indices[0]], drawW, drawH);
  line(pLast.x, pLast.y, pFirst.x, pFirst.y);
}

// 執行截圖並儲存的函式
function saveVideoFrame() {
  // 配合畫面縮放，重新計算視訊圖片 50% 的裁切範圍
  let cropW = width * 0.5;
  let cropH = height * 0.5;
  let cropX = width / 2 - cropW / 2;
  let cropY = height / 2 - cropH / 2;
  
  // 使用 get(x, y, w, h) 擷取該範圍的影像（包含視訊與泡泡），並存為 jpg
  let img = get(cropX, cropY, cropW, cropH);
  img.save('screenshot', 'jpg');
}
