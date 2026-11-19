
<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: 'Tanda Tangan',
  },
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const canvas = ref(null);
const isDrawing = ref(false);
const hasDrawn = ref(false);

let context = null;
let lastX = 0;
let lastY = 0;

onMounted(() => {
  const element = canvas.value;

  if (!element) return;

  context = element.getContext('2d');

  context.lineWidth = 4;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = '#172554';
});

function getPosition(event) {
  const rect = canvas.value.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.value.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.value.height,
  };
}

function startDrawing(event) {
  if (!context) return;

  event.preventDefault();

  const position = getPosition(event);

  isDrawing.value = true;
  hasDrawn.value = true;

  lastX = position.x;
  lastY = position.y;

  canvas.value.setPointerCapture(event.pointerId);

  context.beginPath();
  context.moveTo(lastX, lastY);
}

function draw(event) {
  if (!isDrawing.value || !context) return;

  event.preventDefault();

  const position = getPosition(event);

  context.beginPath();
  context.moveTo(lastX, lastY);
  context.lineTo(position.x, position.y);
  context.stroke();

  lastX = position.x;
  lastY = position.y;
}

function stopDrawing(event) {
  if (!isDrawing.value) return;

  isDrawing.value = false;

  if (hasDrawn.value) {
    emit('update:modelValue', canvas.value.toDataURL('image/png'));
  }

  if (
    event?.pointerId !== undefined &&
    canvas.value.hasPointerCapture(event.pointerId)
  ) {
    canvas.value.releasePointerCapture(event.pointerId);
  }
}

function clearSignature() {
  if (!context || !canvas.value) return;

  context.clearRect(
    0,
    0,
    canvas.value.width,
    canvas.value.height
  );

  hasDrawn.value = false;

  emit('update:modelValue', '');
}
</script>

<template>
  <div class="signature-container">
    <div class="signature-header">
      <label class="signature-label">{{ label }}</label>

      <button
        type="button"
        class="clear-button"
        @click="clearSignature"
      >
        Hapus
      </button>
    </div>

    <div class="canvas-wrapper">
      <canvas
        ref="canvas"
        width="900"
        height="300"
        class="signature-canvas"
        @pointerdown="startDrawing"
        @pointermove="draw"
        @pointerup="stopDrawing"
        @pointercancel="stopDrawing"
        @lostpointercapture="stopDrawing"
      ></canvas>

      <div class="signature-line"></div>
      <span class="signature-hint">
        Bubuhkan tanda tangan di area ini
      </span>
    </div>

    <p
      class="signature-status"
      :class="{ signed: hasDrawn }"
    >
      {{ hasDrawn ? 'Tanda tangan sudah dibuat' : 'Belum ada tanda tangan' }}
    </p>
  </div>
</template>

<style scoped>
.signature-container {
  width: 100%;
}

.signature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.signature-label {
  font-weight: 600;
  color: #1f2937;
}

.clear-button {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.clear-button:hover {
  background: #f3f4f6;
}

.canvas-wrapper {
  position: relative;
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.signature-canvas {
  display: block;
  width: 100%;
  height: 180px;
  cursor: crosshair;
  touch-action: none;
}

.signature-line {
  position: absolute;
  left: 5%;
  right: 5%;
  bottom: 38px;
  border-bottom: 1px dashed #9ca3af;
  pointer-events: none;
}

.signature-hint {
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  pointer-events: none;
}

.signature-status {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.signature-status.signed {
  color: #15803d;
}
</style>
