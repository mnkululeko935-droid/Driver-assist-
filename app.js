import { FaceLandmarker, FilesetResolver } from
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { getEAR } from "./eyes.js";

const video = document.getElementById("video");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");

let audioCtx, osc, timer;
const alarm = {
  unlock() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
  },
  play() {
    this.unlock();
    if (osc) return;
    osc = audioCtx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 900;
    osc.connect(audioCtx.destination);
    osc.start();
    timer = setInterval(() => {
      osc.frequency.value = osc.frequency.value === 900 ? 1500 : 900;
    }, 250);
  },
  pause() {
    clearInterval(timer);
    if (osc) { osc.stop(); osc.disconnect(); osc = null; }
  },
  currentTime: 0
};

const EAR_LIMIT = 0.2;   // below this = eyes closed
const WARN_MS = 1500;    // level 1: flash + alarm
const SLEEP_MS = 3000;   // level 2: also vibrate

let landmarker, closedSince = null, level = 0;

function setLevel(newLevel, msg) {
  statusEl.textContent = msg;
  if (newLevel === level) return;
  level = newLevel;
  overlay.classList.toggle("flash", level > 0);
  if (level > 0) { alarm.play(); } else { alarm.pause(); }
  if (navigator.vibrate) {
    if (level === 2) navigator.vibrate(Array(40).fill([600, 200]).flat());
    else navigator.vibrate(0);
  }
}

function check(lm) {
  if (!lm) { closedSince = null; setLevel(0, "No face seen"); return; }
  if (getEAR(lm) > EAR_LIMIT) {
    closedSince = null;
    setLevel(0, "Eyes open - OK");
    return;
  }
  if (!closedSince) closedSince = performance.now();
  const t = performance.now() - closedSince;
  if (t > SLEEP_MS) setLevel(2, "WAKE UP!!!");
  else if (t > WARN_MS) setLevel(1, "Eyes closed!");
}

function loop() {
  if (video.readyState >= 2) {
    const res = landmarker.detectForVideo(video, performance.now());
    check(res.faceLandmarks[0]);
  }
  requestAnimationFrame(loop);
}

async function start() {
  startBtn.disabled = true;
  statusEl.textContent = "Loading...";
  alarm.unlock();
  const files = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  landmarker = await FaceLandmarker.createFromOptions(files, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numFaces: 1
  });
  video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
  await video.play();
  loop();
}

startBtn.addEventListener("click", start);
