/* =========================
   AUDIO BANK
========================= */




const audioBank = [
  {
    id: "AomorikenHirakawashi_Senkotsu_202556",
    file: "audio/AomorikenHirakawashi_Senkotsu_202556.mp3"
  },
  {
    id: "OsakaNakatsu_weather_zekkotsu_20250427",
    file: "audio/OsakaNakatsu_weather_zekkotsu_20250427.mp3"
  },
  {
    id: "TokyoKitakuAkabanekita_Nozomu_Rokkotu_20250427",
    file: "audio/TokyoKitakuAkabanekita_Nozomu_Rokkotu_20250427.mp3"
  }
];


/* =========================
   ASSIGNMENT STATE
========================= */

const boneAssignments = {
  "bone-1": null,
  "bone-2": null,
  "bone-3": null,
  "bone-4": null,
  "bone-5": null,
  "bone-6": null,
  "bone-7": null
};


/* =========================
   GLOBAL STATE
========================= */

let selectedBone = null;

let previewAudio = null;
let previewTimer = null;

let playingAudios = [];
let playbackTimer = null;
let isPlaying = false;


/* =========================
   INIT : BONE CLICK
========================= */

document.querySelectorAll(".bone").forEach(bone => {
  bone.addEventListener("click", () => {
    if (isPlaying) return;        // 再生中はロック
    if (bone.id === "bone-8") return;

    selectedBone = bone.id;
    openAudioPanel();
  });
});


/* =========================
   AUDIO PANEL UI
========================= */

function openAudioPanel() {
  const panel = document.getElementById("audio-panel");
  const list = document.getElementById("audio-list");
  const title = document.getElementById("audio-panel-title");

  title.textContent = `SELECT AUDIO（${selectedBone}）`;
  list.innerHTML = "";

  audioBank.forEach(audio => {
    const li = document.createElement("li");

    const label = document.createElement("span");
    label.className = "audio-id";
    label.textContent = audio.id;

    const controls = document.createElement("div");
    controls.className = "audio-controls";

    const previewBtn = document.createElement("button");
    previewBtn.textContent = "▶︎ preview";
    previewBtn.onclick = () => playPreview(audio);

    const assignBtn = document.createElement("button");
    assignBtn.textContent = "✔ assign";
    assignBtn.onclick = () => assignAudioToBone(selectedBone, audio);

    controls.appendChild(previewBtn);
    controls.appendChild(assignBtn);

    li.appendChild(label);
    li.appendChild(controls);
    list.appendChild(li);
  });

  panel.classList.remove("hidden");
}


/* =========================
   PREVIEW (10 seconds)
========================= */

function playPreview(audio) {
  stopPreview();

  previewAudio = new Audio(audio.file);
  previewAudio.currentTime = 0;
  previewAudio.play().catch(err => {
    console.warn("プレビュー再生失敗:", err);
  });

  previewTimer = setTimeout(() => {
    stopPreview();
  }, 10000);
}

function stopPreview() {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
    previewAudio = null;
  }
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
}


/* =========================
   ASSIGN AUDIO TO BONE
========================= */

function assignAudioToBone(boneId, audio) {
  if (!boneId) return;

  boneAssignments[boneId] = audio;

  const boneEl = document.getElementById(boneId);
  boneEl.classList.add("assigned");

  checkPlaybackReady();

  updateProgress();

  closeAudioPanel(); // ← 追加
}

function closeAudioPanel() {
  document.getElementById("audio-panel")
    .classList.add("hidden");
  selectedBone = null;
}


document.addEventListener("click", (e) => {
  const panel = document.getElementById("audio-panel");

  if (panel.classList.contains("hidden")) return;
  if (panel.contains(e.target)) return;
  if (e.target.closest(".bone")) return;

  closeAudioPanel();
});



/* =========================
   PLAYBACK READY CHECK
========================= */

function allBonesAssigned() {
  return Object.values(boneAssignments).every(a => a !== null);
}

function checkPlaybackReady() {
  const playBtn = document.getElementById("play-button");

  if (allBonesAssigned()) {
    playBtn.classList.remove("hidden");
  }
}


/* =========================
   PLAYBACK CONTROL
========================= */

document
  .getElementById("play-button")
  .addEventListener("click", startPlayback);


function startPlayback() {

  closeAudioPanel();

  if (isPlaying) return;

  isPlaying = true;
  stopPreview();

  const playBtn = document.getElementById("play-button");
  playBtn.disabled = true;
  playBtn.textContent = "再生中…";

  playingAudios = [];

  Object.values(boneAssignments).forEach(audio => {
    const a = new Audio(audio.file);
    a.currentTime = 0;
    a.play().catch(err => {
      console.warn("再生失敗:", err);
    });
    playingAudios.push(a);
  });

  // 5分（300秒）で停止
  playbackTimer = setTimeout(stopPlayback, 300000);
}


function startPlayback() {
  if (isPlaying) return;

  isPlaying = true;
  stopPreview();

  const overlay = document.getElementById("loading-overlay");
  const progressText = document.getElementById("loading-progress");

  overlay.classList.remove("hidden");

  playingAudios = [];
  let loadedCount = 0;
  const total = 7;

  Object.values(boneAssignments).forEach(audio => {
    const a = new Audio(audio.file);
    a.preload = "auto";

    a.addEventListener("canplaythrough", () => {
      loadedCount++;
      progressText.textContent = `${loadedCount} / ${total}`;

      if (loadedCount === total) {
        overlay.classList.add("hidden");
        actuallyPlayAll();
      }
    }, { once: true });

    playingAudios.push(a);
  });
}



function actuallyPlayAll() {
  const playBtn = document.getElementById("play-button");
  playBtn.disabled = true;
  playBtn.textContent = "再生中…";

  playingAudios.forEach(a => {
    a.currentTime = 0;
    a.play().catch(err => console.warn(err));
  });

  playbackTimer = setTimeout(stopPlayback, 300000);
}




function updateProgress() {

    ensureProgressWrapper(); 
  const assignedCount = Object.values(boneAssignments)
    .filter(a => a !== null).length;

  const percent = Math.round((assignedCount / 7) * 100);

  const bar = document.getElementById("progress-bar");
  const text = document.getElementById("progress-text");

  bar.style.width = `${percent}%`;
  text.textContent = `${percent}%`;

  if (!bar || !text) return; // 念のための保険

  bar.style.width = `${percent}%`;
  text.textContent = `${assignedCount} / 7 (${percent}%)`;
}




function ensureProgressWrapper() {
  let wrapper = document.getElementById("progress-wrapper");
  if (wrapper) return wrapper;

  wrapper = document.createElement("div");
  wrapper.id = "progress-wrapper";
  wrapper.innerHTML = `
    <div id="progress-bar-bg">
      <div id="progress-bar"></div>
    </div>
    <div id="progress-text">0 / 7 (0%)</div>
  `;
  document.body.appendChild(wrapper);
  return wrapper;
}




