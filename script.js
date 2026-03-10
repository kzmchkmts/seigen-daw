/* =========================
   AUDIO BANK
========================= */

const audioBank = [
  { id: "AomorikenHirakawashi_Senkotsu_202556", file: "audio/AomorikenHirakawashi_Senkotsu_202556.mp3" },
  { id: "AomorikenHirakawashi_Senkotsu_202556", file: "audio/AomorikenHirakawashi_Senkotsu_202556.mp3" },
  { id: "OsakaNakatsu_weather_zekkotsu_20250427", file: "audio/OsakaNakatsu_weather_zekkotsu_20250427.mp3" },
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

// --- Recording ---
let micStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let recordedMime = "";
let recordedExt = "webm"; // default

// 5min fixed
const FIXED_MS = 300000; // 5分

/* =========================
   DOM HELPERS
========================= */

function $(id) {
  return document.getElementById(id);
}

function lockUIWithOverlay(message, sub = "") {
  uiLocked = true;
  const overlay = $("loading-overlay");
  const loadingText = $("loading-text");
  const progressText = $("loading-progress");
  const overlayPlayBtn = $("overlay-play-button");

  overlay.classList.remove("hidden");
  overlayPlayBtn.classList.add("hidden");

  loadingText.textContent = message;
  progressText.textContent = sub;
}

function unlockOverlayOnly() {
  const overlay = $("loading-overlay");
  overlay.classList.add("hidden");
}

function sanitizeFilenamePart(s) {
  // アルファベット/数字/アンダースコア/ハイフンに寄せる（展示で事故りにくい）
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/* =========================
   BOOTSTRAP
========================= */

document.addEventListener("DOMContentLoaded", () => {

  /* ① 骨クリック登録 */
  document.querySelectorAll(".bone").forEach(bone => {
    bone.addEventListener("click", () => {
      if (uiLocked) return;
      if (bone.id === "bone-8") return; // head is locked
      selectedBone = bone.id;
      openAudioPanel();
    });
  });

  /* ② 下部の再生ボタン → ローディング開始 */
  const playBtn = $("play-button");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (uiLocked) return;
      startLoadingPhase();
    });
  }

  /* ③ overlay 内の最終再生/録音ボタン（ユーザークリックが必須） */
  const overlayPlayBtn = $("overlay-play-button");
  if (overlayPlayBtn) {
    overlayPlayBtn.addEventListener("click", async () => {
      if (uiLocked) return;

      const ok = window.confirm(
        `再生と同時に録音が始まります。
声を通す準備は本当によろしいですか？
よろしければ再生/録音ボタンを押してください。

Recording will start at the same time as playback.
Are you sure you are ready to let your voice pass through?
If you are ready, please press the Play / Record button.`
      );
      if (!ok) return;

      // ここから「ユーザージェスチャ内」で開始するのがSafari的に重要
      try {
        await startPlaybackAndRecording(); // ← 全部ここで開始
      } catch (err) {
        console.error(err);
        uiLocked = false;
        lockUIWithOverlay(
          "録音を開始できませんでした。",
          "マイク許可 / ブラウザ対応を確認してください。"
        );
      }
    });
  }

  /* アップロードボタン */
  const uploadBtn = $("upload-button");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      if (uiLocked) return;
      uploadRecordingWithMeta();
    });
  }
});

/* =========================
   AUDIO PANEL
========================= */

function openAudioPanel() {
  const panel = $("audio-panel");
  const list = $("audio-list");
  const title = $("audio-panel-title");

  title.textContent = `SELECT AUDIO --- (10 sec preview) (${selectedBone})`;
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
  $("audio-panel").classList.add("hidden");
  selectedBone = null;
}

// パネル外クリックで閉じる
document.addEventListener("click", (e) => {
  const panel = $("audio-panel");
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
  $(boneId).classList.add("assigned");

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

  const bar = $("progress-bar");
  const text = $("progress-text");

  bar.style.width = `${percent}%`;
  text.textContent = `${assigned} / 7 (${percent}%)`;
}

function checkPlaybackReady() {
  if (Object.values(boneAssignments).every(Boolean)) {
    const playBtn = $("play-button");
    playBtn.classList.remove("hidden");
    playBtn.textContent = "▶ 再生を開始";
  }
}

/* =========================
   LOADING PHASE
========================= */

function startLoadingPhase() {
  uiLocked = true;

  const overlay = $("loading-overlay");
  const loadingText = $("loading-text");
  const progressText = $("loading-progress");
  const overlayPlayBtn = $("overlay-play-button");

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
        loadingText.textContent = "準備完了：再生/録音を開始します";
        overlayPlayBtn.classList.remove("hidden");
        uiLocked = false; // ボタン押せるように戻す
      }
    }, { once: true });

    playingAudios.push(a);
  });
}

/* =========================
   SAFARI-AWARE: PICK MIME
========================= */

function chooseRecordingMime() {
  // できるだけ互換性の高い順に選ぶ
  const candidates = [
    // Safariがmp4/aacを持っているケース（WebKitブログにも言及あり） :contentReference[oaicite:2]{index=2}
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",

    // Safari 18.4 以降でWebMが通るケース :contentReference[oaicite:3]{index=3}
    "audio/webm;codecs=opus",
    "audio/webm",

    // 最後の保険
    ""
  ];

  for (const mt of candidates) {
    if (!mt) break;
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(mt)) {
      recordedMime = mt;
      if (mt.includes("mp4")) {
        recordedExt = "m4a"; // 実際にはmp4コンテナ、音だけならm4a扱いが自然
      } else if (mt.includes("webm")) {
        recordedExt = "webm";
      } else {
        recordedExt = "dat";
      }
      return;
    }
  }

  recordedMime = "";
  recordedExt = "webm";
}

/* =========================
   PLAYBACK + RECORDING (single user gesture)
========================= */

async function startPlaybackAndRecording() {
  // ここから先は「ユーザークリック」内で呼ばれている想定（Safari対策）

  // 元画面再生ボタンを殺す
  const playBtn = $("play-button");
  if (playBtn) {
    playBtn.classList.add("hidden");
    playBtn.disabled = true;
  }

  // UI完全ロック（録音中表示で覆う）
  lockUIWithOverlay("録音中です（5分間）", "ページを閉じないでください");

  // 1) 録音開始（許可ダイアログもここで出る）
  await startRecording();

  startHeadEmergence(); // ←追加

  // 2) 再生開始（同じジェスチャ内で呼ぶのが重要）
  playingAudios.forEach(a => {
    a.currentTime = 0;
    a.play().catch((e) => console.warn("play() failed:", e));
  });

  // 3) 5分後に停止（停止操作は提供しない）
  if (playbackTimer) clearTimeout(playbackTimer);
  playbackTimer = setTimeout(stopPlaybackAndRecording, FIXED_MS);
}

async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("getUserMedia not supported");
  }
  if (!window.MediaRecorder) {
    throw new Error("MediaRecorder not supported");
  }

  chooseRecordingMime();

  // iOS Safariで“マイク開始で出力ルーティングが変わる”系の癖があるので、
  // まず素直にストリーム取得（必要なら後でAudioSession系を追加）
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  recordedChunks = [];
  recordedBlob = null;

  const options = recordedMime ? { mimeType: recordedMime } : undefined;
  mediaRecorder = new MediaRecorder(micStream, options);

  mediaRecorder.addEventListener("dataavailable", (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  });

  mediaRecorder.addEventListener("stop", () => {
    // Blob化
    const type = recordedMime || "audio/webm";
    recordedBlob = new Blob(recordedChunks, { type });

  // ★ この1行だけ追加
  saveBlobLocally(recordedBlob, recordedExt);

    // マイク停止（LED/許可表示を消す）
    try {
      micStream?.getTracks()?.forEach(t => t.stop());
    } catch (_) {}

    // 収録後フォームへ
    showMetaForm();
  });

  // timesliceを指定するとデータが分割で来て扱いやすいことがある
  // （ただし挙動がブラウザ差あるので最小）
  mediaRecorder.start();
}

function stopPlaybackAndRecording() {
  if (playbackTimer) clearTimeout(playbackTimer);

  // 再生停止
  playingAudios.forEach(a => {
    a.pause();
    a.currentTime = 0;
  });

  // 録音停止 → onstopでフォーム表示へ
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  } else {
    // 何らかでrecorderが無い場合でもUI復帰
    showMetaForm();
  }
}

/* =========================
   META FORM
========================= */

function showMetaForm() {
  uiLocked = false;
  unlockOverlayOnly();

  const meta = $("record-meta");
  if (meta) meta.classList.remove("hidden");
}

/* =========================
   UPLOAD (with progress)
========================= */

function uploadRecordingWithMeta() {
  if (!recordedBlob) {
    alert("録音データが見つかりません。");
    return;
  }

  const name = sanitizeFilenamePart($("meta-name")?.value);
  const location = sanitizeFilenamePart($("meta-location")?.value);
  const bone = sanitizeFilenamePart($("meta-bone")?.value);

  if (!name || !location || !bone) {
    alert("name / location / bone name をすべて入力してください。");
    return;
  }

const now = new Date();
const timestamp =
  now.getFullYear() +
  String(now.getMonth()+1).padStart(2,"0") +
  String(now.getDate()).padStart(2,"0") +
  "-" +
  String(now.getHours()).padStart(2,"0") +
  String(now.getMinutes()).padStart(2,"0") +
  String(now.getSeconds()).padStart(2,"0");

const filename = `${name}_${location}_${bone}_${timestamp}.${recordedExt}`;

  // UI: アップロード中
  uiLocked = true;

  const status = $("upload-status");
  if (status) status.textContent = "アップロード中です。ページを閉じないでください。";

  const bar = $("upload-bar");
  if (bar) bar.style.width = "0%";

  // XHRでアップロード進捗（fetchだと進捗が取りにくい）
  const xhr = new XMLHttpRequest();

  // ★ここがサーバー側エンドポイント
  // 自前サーバーなら /upload を用意
xhr.open(
  "POST",
  "https://calm-math-512e.madegg0.workers.dev",
  true
);

  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;
    const pct = Math.round((e.loaded / e.total) * 100);
    if (bar) bar.style.width = `${pct}%`;
  };

  xhr.onload = () => {
    uiLocked = false;
    if (xhr.status >= 200 && xhr.status < 300) {
      if (status) status.textContent = "アップロード完了";
      // 完了後遷移（まだ作らないなら仮でOK）
      window.location.href = "/complete.html";
    } else {
      console.error(xhr.responseText);
      if (status) status.textContent = "アップロードに失敗しました。";
      alert("アップロードに失敗しました。サーバー側を確認してください。");
    }
  };

  xhr.onerror = () => {
    uiLocked = false;
    if (status) status.textContent = "アップロードに失敗しました。";
    alert("ネットワークエラーでアップロードに失敗しました。");
  };

  const formData = new FormData();
  formData.append("file", recordedBlob, filename);
  formData.append("name", name);
  formData.append("location", location);
  formData.append("bone", bone);

  xhr.send(formData);
}

/* =========================
   DRAGGABLE AUDIO PANEL (original)
========================= */

(function enableAudioPanelDrag() {
  const panel = $("audio-panel");
  if (!panel) return;

  let isDragging = false;
  let startX, startY, startLeft, startTop;

  panel.addEventListener("mousedown", (e) => {
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






function saveBlobLocally(blob, ext) {
  const d = new Date();
  const ts =
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") + "_" +
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0") +
    String(d.getSeconds()).padStart(2, "0");

  const filename = `recording_test_${ts}.${ext}`;
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}









function startHeadEmergence() {

  const head = document.getElementById("bone-8");
  if (!head) return;

  head.style.transition = `opacity ${FIXED_MS}ms linear`;
  head.style.opacity = 1;

}
