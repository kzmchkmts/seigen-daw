/* =========================
   AUDIO BANK
========================= */

const audioBank = [
  { id: "AomorikenHirakawashi_Senkotsu_202556", file: "audio/AomorikenHirakawashi_Senkotsu_202556.mp3" },
  { id: "ChofushiSengawa_reiji_senkotsu_unknown", file: "audio/ChofushiSengawa_reiji_senkotsu.mp3" },
  { id: "Nerimaku_kuko_zentoukotsu_20250202", file: "audio/Nerimaku_kuko_zentoukotsu_20250202.mp3" },
  { id: "Shimokyoku_Tachibana_sekitsuikotsu_20250201 ", file: "audio/shimokyoku_Tachibana_sekitsuikotsu_20250201 .mp3" },
  { id: "Shizuokakengotenbashi_hozuku_hidarikoyubi_20250131", file: "audio/Shizuokakengotenbashi_hozuku_hidarikoyubi_20250131.mp3" },
  { id: "TokyoKitakuAkabanekita_Nozomu_Rokkotu_20250427", file: "audio/TokyoKitakuAkabanekita_Nozomu_Rokkotu_20250427.mp3" }
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

let uiLocked = false;
let readyToPlay = false;

/* =========================
   BOOTSTRAP
========================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     ① 骨クリック登録
  ========================= */
  document.querySelectorAll(".bone").forEach(bone => {
    bone.addEventListener("click", () => {
      if (uiLocked) return;
      if (bone.id === "bone-8") return;

      selectedBone = bone.id;
      openAudioPanel();
    });
  });

  /* =========================
     ② 下部の再生ボタン → ローディング開始
        （※ 最終再生ではない）
  ========================= */
  const playBtn = document.getElementById("play-button");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (uiLocked) return;
      startLoadingPhase();
    });
  }

  /* =========================
     ③ overlay 内の最終再生ボタン
        （ここが「決断の一押し」）
  ========================= */
  const overlayPlayBtn = document.getElementById("overlay-play-button");
  if (overlayPlayBtn) {
    overlayPlayBtn.addEventListener("click", () => {

      // overlay を消す
      const overlay = document.getElementById("loading-overlay");
      if (overlay) overlay.classList.add("hidden");

      // ★ 元画面の再生ボタンを完全に消す
      if (playBtn) {
        playBtn.classList.add("hidden");
        playBtn.disabled = true;
      }

      // 実際の再生開始
      playingAudios.forEach(a => {
        a.currentTime = 0;
        a.play().catch(() => {});
      });

      // UIロック（再生中）
      uiLocked = true;
    });
  }

});

/* =========================
   AUDIO PANEL
========================= */

function openAudioPanel() {
  const panel = document.getElementById("audio-panel");
  const list = document.getElementById("audio-list");
  const title = document.getElementById("audio-panel-title");

  title.textContent = `SELECT AUDIO (${selectedBone})`;
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

function closeAudioPanel() {
  document.getElementById("audio-panel").classList.add("hidden");
  selectedBone = null;
}

// パネル外クリックで閉じる
document.addEventListener("click", (e) => {
  const panel = document.getElementById("audio-panel");
  if (panel.classList.contains("hidden")) return;
  if (panel.contains(e.target)) return;
  if (e.target.closest(".bone")) return;
  closeAudioPanel();
});

/* =========================
   PREVIEW
========================= */

function playPreview(audio) {
  stopPreview();

  previewAudio = new Audio(audio.file);
  previewAudio.currentTime = 0;
  previewAudio.play().catch(() => {});

  previewTimer = setTimeout(stopPreview, 10000);
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
   ASSIGN
========================= */

function assignAudioToBone(boneId, audio) {
  if (!boneId) return;

  boneAssignments[boneId] = audio;
  document.getElementById(boneId).classList.add("assigned");

  updateProgress();
  checkPlaybackReady();
  closeAudioPanel();
}

/* =========================
   PROGRESS
========================= */

function updateProgress() {
  const assigned = Object.values(boneAssignments).filter(Boolean).length;
  const percent = Math.round((assigned / 7) * 100);

  const bar = document.getElementById("progress-bar");
  const text = document.getElementById("progress-text");

  bar.style.width = `${percent}%`;
  text.textContent = `${assigned} / 7 (${percent}%)`;
}

function checkPlaybackReady() {
  if (Object.values(boneAssignments).every(Boolean)) {
    const playBtn = document.getElementById("play-button");
    playBtn.classList.remove("hidden");
    playBtn.textContent = "▶ 再生を開始";
  }
}

/* =========================
   LOADING PHASE
========================= */

function startLoadingPhase() {
  uiLocked = true;

  const overlay = document.getElementById("loading-overlay");
  const loadingText = document.getElementById("loading-text");
  const progressText = document.getElementById("loading-progress");
  const overlayPlayBtn = document.getElementById("overlay-play-button");

  overlay.classList.remove("hidden");
  overlayPlayBtn.classList.add("hidden");

  loadingText.textContent = "音源を読み込んでいます…";
  progressText.textContent = "0 / 7";

  playingAudios = [];
  let loaded = 0;
  const total = 7;

  Object.values(boneAssignments).forEach(audio => {
    const a = new Audio(audio.file);
    a.preload = "auto";

    a.addEventListener("canplaythrough", () => {
      loaded++;
      progressText.textContent = `${loaded} / ${total}`;

      if (loaded === total) {
        // ★ 準備完了状態
        loadingText.textContent = "準備完了：再生をタップしてください";
        overlayPlayBtn.classList.remove("hidden");
        uiLocked = false;
      }
    }, { once: true });

    playingAudios.push(a);
  });
}

/* =========================
   ACTUAL PLAYBACK
========================= */

function startActualPlayback() {
  if (!readyToPlay) return;

  readyToPlay = false;
  uiLocked = true;

  document.getElementById("loading-overlay").classList.add("hidden");
  document.getElementById("overlay-play-button").classList.add("hidden");

  playingAudios.forEach(a => {
    a.currentTime = 0;
    a.play().catch(() => {});
  });

  playbackTimer = setTimeout(stopPlayback, 300000);
}

/* =========================
   STOP
========================= */

function stopPlayback() {
  if (playbackTimer) clearTimeout(playbackTimer);

  playingAudios.forEach(a => {
    a.pause();
    a.currentTime = 0;
  });

  uiLocked = false;
}




(function enableAudioPanelDrag() {
  const panel = document.getElementById("audio-panel");
  if (!panel) return;

  let isDragging = false;
  let startX, startY, startLeft, startTop;

  panel.addEventListener("mousedown", (e) => {
    // ボタン押下は無視（誤操作防止）
    if (e.target.tagName === "BUTTON") return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.left = `${startLeft}px`;
    panel.style.top = `${startTop}px`;

    panel.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    panel.style.left = `${startLeft + dx}px`;
    panel.style.top = `${startTop + dy}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    panel.style.cursor = "default";
  });
})();
