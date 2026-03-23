const MODEL_URL = './models';

// DOM 元素
const imageInput = document.getElementById('image-input');
const detectBtn = document.getElementById('detect-btn');
const statusText = document.getElementById('status-text');
const statusPill = document.getElementById('status-pill');

const previewImage = document.getElementById('preview-image');
const overlayCanvas = document.getElementById('overlay-canvas');
const previewPlaceholder = document.getElementById('preview-placeholder');

const currentModeLabel = document.getElementById('current-mode-label');
const faceCountEl = document.getElementById('face-count');
const faceDetailList = document.getElementById('face-detail-list');

let modelLoaded = false;

/** 本次图片加载完成后要画上的检测结果；null 表示仅适配画布、不画框 */
let pendingImageDetections = null;
/** 当前预览图对应的最近一次检测结果，用于窗口 resize 后重画框 */
let lastImageDetections = null;

function updatePreviewPlaceholder() {
  if (!previewPlaceholder) return;
  const srcAttr = previewImage && previewImage.getAttribute('src');
  const hasImage = !!(srcAttr && srcAttr.trim());
  previewPlaceholder.style.display = !hasImage ? 'grid' : 'none';
}

// 工具函数：状态标签
function setStatus(text, type = 'info') {
  statusText.textContent = text;

  statusPill.classList.remove('success', 'error');
  if (type === 'success') {
    statusPill.classList.add('success');
    statusPill.textContent = '就绪';
  } else if (type === 'error') {
    statusPill.classList.add('error');
    statusPill.textContent = '错误';
  } else {
    statusPill.textContent = '进行中';
  }
}

function detectorOptions() {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.5,
  });
}

// 工具函数：根据图片尺寸调整 canvas
function resizeCanvasToImage() {
  if (!previewImage.naturalWidth || !previewImage.naturalHeight) return;
  const rect = previewImage.getBoundingClientRect();
  overlayCanvas.width = rect.width;
  overlayCanvas.height = rect.height;
  overlayCanvas.style.width = `${rect.width}px`;
  overlayCanvas.style.height = `${rect.height}px`;
}

// 清空 canvas
function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function shrinkOverlayCanvas() {
  overlayCanvas.width = 0;
  overlayCanvas.height = 0;
  overlayCanvas.style.width = '0px';
  overlayCanvas.style.height = '0px';
}

function syncPreviewOverlay() {
  resizeCanvasToImage();
  if (pendingImageDetections !== null) {
    lastImageDetections = pendingImageDetections;
    pendingImageDetections = null;
  }
  if (lastImageDetections !== null && previewImage.getAttribute('src')) {
    drawDetectionsOnImage(lastImageDetections);
  }
}

// 把检测结果画在图片上
function drawDetectionsOnImage(detections) {
  clearCanvas(overlayCanvas);
  if (!previewImage.naturalWidth || !previewImage.naturalHeight) return;

  const rect = previewImage.getBoundingClientRect();
  const scaleX = rect.width / previewImage.naturalWidth;
  const scaleY = rect.height / previewImage.naturalHeight;

  const ctx = overlayCanvas.getContext('2d');
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#22c55e';

  detections.forEach((det) => {
    const box = det.box;
    const x = box.x * scaleX;
    const y = box.y * scaleY;
    const width = box.width * scaleX;
    const height = box.height * scaleY;

    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
  });
}

// 渲染右侧“检测详情列表”
function renderFaceDetails(detections, modeLabel) {
  currentModeLabel.textContent = modeLabel;
  faceCountEl.textContent = detections.length;

  if (!detections.length) {
    faceDetailList.innerHTML =
      '<div class="text-secondary small">未检测到人脸。</div>';
    return;
  }

  const fragments = detections.map((det, idx) => {
    const box = det.box;
    const score =
      det.score !== undefined
        ? det.score
        : det.detection && det.detection.score !== undefined
        ? det.detection.score
        : null;

    const scoreText = score ? `${(score * 100).toFixed(1)}%` : 'N/A';

    return `
      <div class="face-item p-2 mb-2 d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-semibold">第 ${idx + 1} 张人脸</div>
          <small>
            x: ${box.x.toFixed(1)}，y: ${box.y.toFixed(1)}，
            w: ${box.width.toFixed(1)}，h: ${box.height.toFixed(1)}
          </small><br/>
          <small>置信度（score）：${scoreText}</small>
        </div>
      </div>
    `;
  });

  faceDetailList.innerHTML = fragments.join('');
}

// 加载模型
async function loadModels() {
  try {
    setStatus('正在初始化推理后端...', 'info');
    if (faceapi && faceapi.tf && typeof faceapi.tf.setBackend === 'function') {
      try {
        await faceapi.tf.setBackend('webgl');
        await faceapi.tf.ready();
      } catch (e) {
        await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();
      }
    }

    setStatus('正在加载 TinyFaceDetector 模型...', 'info');
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    modelLoaded = true;

    detectBtn.disabled = false;
    detectBtn.textContent = '开始检测人脸';
    setStatus('模型加载完成，可以开始检测。', 'success');
  } catch (err) {
    setStatus(`模型加载失败：${err.message}`, 'error');
    detectBtn.disabled = true;
  }
}

// 图片选择
if (imageInput) {
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    pendingImageDetections = null;
    lastImageDetections = null;
    shrinkOverlayCanvas();
    clearCanvas(overlayCanvas);

    if (!file) {
      previewImage.removeAttribute('src');
      renderFaceDetails([], '图片检测');
      updatePreviewPlaceholder();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      updatePreviewPlaceholder();
    };
    reader.readAsDataURL(file);
  });
}

// 图片加载后：对齐覆盖层画布，并按 pending / last 绘制检测框
if (previewImage) {
  previewImage.addEventListener('load', () => {
    syncPreviewOverlay();
    updatePreviewPlaceholder();
  });
}

// 窗口尺寸变化时，重新适配 canvas
window.addEventListener('resize', () => {
  if (previewImage && previewImage.getAttribute('src')) {
    syncPreviewOverlay();
  }
});

// 图片检测按钮
if (detectBtn) {
  detectBtn.addEventListener('click', async () => {
    if (!modelLoaded) return;
    const file = imageInput.files[0];
    if (!file) {
      alert('请先选择一张图片。');
      return;
    }

    detectBtn.disabled = true;
    const oldText = detectBtn.textContent;
    detectBtn.textContent = '检测中...';
    setStatus('正在对图片进行检测...', 'info');

    try {
      const img = await faceapi.bufferToImage(file);
      const detections = await faceapi.detectAllFaces(img, detectorOptions());

      pendingImageDetections = detections;
      shrinkOverlayCanvas();
      previewImage.src = img.src;
      if (previewImage.complete && previewImage.naturalWidth) {
        syncPreviewOverlay();
      }

      setStatus(`检测完成，检测到 ${detections.length} 张人脸。`, 'success');
      renderFaceDetails(detections, '图片检测');
    } catch (err) {
      alert(`检测失败：${err.message}`);
      setStatus(`检测失败：${err.message}`, 'error');
      renderFaceDetails([], '图片检测');
    } finally {
      detectBtn.disabled = false;
      detectBtn.textContent = oldText;
    }
  });
}

// 初始化加载模型
loadModels();
updatePreviewPlaceholder();
