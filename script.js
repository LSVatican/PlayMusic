let db;
let currentAudio = new Audio();
let audioList = [];
let currentIndex = -1;
let activeFilter = 'terbaru';

// 1. Inisialisasi Database (IndexedDB)
const dbReq = indexedDB.open("PlayMusicDB", 1);
dbReq.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};
dbReq.onsuccess = (e) => {
    db = e.target.result;
    checkPermission();
    loadAudioList();
};

// 2. Izin Suara Browser
function checkPermission() {
    if (localStorage.getItem("playMusicPerm") === "granted") {
        document.getElementById("permissionOverlay").style.display = "none";
    }
}

function enableAudio() {
    localStorage.setItem("playMusicPerm", "granted");
    document.getElementById("permissionOverlay").style.display = "none";
    // Play audio kosong sebentar untuk "membuka" kunci browser
    currentAudio.play().catch(() => {}); 
}

// 3. Sistem Unggah dengan Progress Bar
const audioInput = document.getElementById("audioInput");
audioInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const progressWrapper = document.getElementById("progressWrapper");
    progressWrapper.style.display = "block";

    reader.onprogress = (evt) => {
        if (evt.lengthComputable) {
            const percent = Math.round((evt.loaded / evt.total) * 100);
            document.getElementById("progressBar").style.width = percent + "%";
            document.getElementById("progressText").innerText = percent + "%";
        }
    };

    reader.onload = (evt) => {
        const songData = {
            title: file.name.replace(/\.[^/.]+$/, ""),
            data: evt.target.result,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        };

        const tx = db.transaction(["songs"], "readwrite");
        tx.objectStore("songs").add(songData);
        tx.oncomplete = () => {
            toggleUploadModal(false);
            loadAudioList();
            progressWrapper.style.display = "none";
            document.getElementById("progressBar").style.width = "0%";
        };
    };
    reader.readAsDataURL(file);
};

// 4. Load & Filter Data
async function loadAudioList() {
    const tx = db.transaction(["songs"], "readonly");
    const store = tx.objectStore("songs");
    const req = store.getAll();

    req.onsuccess = () => {
        audioList = req.result;
        applyCurrentSort();
    };
}

function applyFilter(btn, type) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = type;
    applyCurrentSort();
}

function applyCurrentSort() {
    let sorted = [...audioList];
    if (activeFilter === 'terbaru') sorted.sort((a,b) => b.timestamp - a.timestamp);
    if (activeFilter === 'terlama') sorted.sort((a,b) => a.timestamp - b.timestamp);
    if (activeFilter === 'a-z') sorted.sort((a,b) => a.title.localeCompare(b.title));
    if (activeFilter === 'ukuran') sorted.sort((a,b) => parseFloat(b.size) - parseFloat(a.size));
    
    renderList(sorted);
}

function renderList(list) {
    const container = document.getElementById("audioList");
    container.innerHTML = list.length === 0 ? '<p style="text-align:center; opacity:0.5;">Belum ada musik.</p>' : "";
    list.forEach((song, index) => {
        container.innerHTML += `
            <div class="audio-item" onclick="playAudio(${index}, '${song.title}')">
                <div style="flex:1">
                    <strong class="truncate">${song.title}</strong><br>
                    <small style="opacity:0.6">${song.date} • ${song.size}</small>
                </div>
                <button class="btn-del" onclick="deleteSong(event, ${song.id})" style="background:none; border:none; color:var(--pink-main)">
                    <i class="fa fa-trash-alt"></i>
                </button>
            </div>
        `;
    });
}

// 5. Kontrol Pemutar & Media Session
function playAudio(index, title) {
    currentIndex = index;
    const song = audioList[index];
    currentAudio.src = song.data;
    currentAudio.play();

    document.getElementById("playerBar").style.display = "flex";
    document.getElementById("playerTitle").innerText = song.title;
    document.getElementById("playBtn").innerHTML = '<i class="fa fa-pause"></i>';
    
    updateMediaMetadata(song);
    updateTimeline();
}

function togglePlay() {
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById("playBtn").innerHTML = '<i class="fa fa-pause"></i>';
    } else {
        currentAudio.pause();
        document.getElementById("playBtn").innerHTML = '<i class="fa fa-play"></i>';
    }
}

function playNext() {
    if (currentIndex < audioList.length - 1) playAudio(currentIndex + 1);
    else playAudio(0);
}

function playPrev() {
    if (currentIndex > 0) playAudio(currentIndex - 1);
    else playAudio(audioList.length - 1);
}

function stopAudio() {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById("playerBar").style.display = "none";
}

function updateTimeline() {
    currentAudio.ontimeupdate = () => {
        const cur = formatTime(currentAudio.currentTime);
        const dur = formatTime(currentAudio.duration || 0);
        document.getElementById("playerTime").innerText = `${cur} / ${dur}`;
        document.getElementById("seekSlider").max = currentAudio.duration || 0;
        document.getElementById("seekSlider").value = currentAudio.currentTime;
    };
    currentAudio.onended = () => playNext();
}

function seekAudio() {
    currentAudio.currentTime = document.getElementById("seekSlider").value;
}

function formatTime(s) {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
}

// 6. Media Session API (Next/Prev Sistem)
function updateMediaMetadata(song) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: 'Daus XD',
            album: 'PlayMusic',
            artwork: [{ src: '/Favicon.png', sizes: '512x512', type: 'image/png' }]
        });
        
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
        navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
}

// 7. Fitur Hapus & Cari
function deleteSong(e, id) {
    e.stopPropagation();
    if (confirm("Hapus lagu ini?")) {
        const tx = db.transaction(["songs"], "readwrite");
        tx.objectStore("songs").delete(id);
        tx.oncomplete = () => loadAudioList();
    }
}

function searchAudio() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    document.getElementById("clearSearch").style.display = query ? "block" : "none";
    const filtered = audioList.filter(s => s.title.toLowerCase().includes(query));
    renderList(filtered);
}

function clearSearch() {
    document.getElementById("searchInput").value = "";
    searchAudio();
}

function toggleUploadModal(show) {
    document.getElementById("uploadModal").style.display = show ? "flex" : "none";
}
