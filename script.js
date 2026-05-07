let db;
let currentAudio = new Audio();
let playlist = [];
let currentIndex = -1;

// 1. Inisialisasi Database (IndexedDB)
const request = indexedDB.open("PlayMusicDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    loadSongs();
};

// 2. Perizinan Suara Browser
// Browser modern memblokir autoplay. Kita harus memicu 'play' lewat interaksi.
function checkPermission() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') {
        // Tampilkan peringatan sistem bawaan jika diperlukan
        console.log("Menunggu interaksi pengguna untuk suara...");
    }
}

// 3. Fungsi Unggah
async function uploadAudio() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) return alert("Pilih file dulu!");
    
    const validFormats = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validFormats.includes(file.type)) return alert("Format tidak didukung!");

    const progressFill = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressPercent');
    document.getElementById('progressContainer').style.display = 'block';

    // Simulasi Progress Bar (Karena IndexedDB lokal sangat cepat)
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressFill.style.width = progress + "%";
        progressText.innerText = progress + "%";
        
        if (progress >= 100) {
            clearInterval(interval);
            saveToDB(file);
        }
    }, 100);
}

function saveToDB(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const transaction = db.transaction(["songs"], "readwrite");
        const song = {
            name: file.name,
            data: e.target.result,
            type: file.type,
            size: (file.size / 1024 / 1024).toFixed(2) + " MB",
            date: new Date().toLocaleString()
        };
        
        transaction.objectStore("songs").add(song);
        transaction.oncomplete = () => {
            togglePopup(false);
            loadSongs();
        };
    };
    reader.readAsArrayBuffer(file);
}

// 4. Load & Render List
function loadSongs() {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        playlist = request.result;
        renderList(playlist);
    };
}

function renderList(data) {
    const listDiv = document.getElementById('audioList');
    listDiv.innerHTML = "";
    
    data.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'audio-item';
        item.onclick = () => playSong(index);
        item.innerHTML = `
            <div class="audio-info">
                <h4>${song.name}</h4>
                <span>${song.size} | ${song.date}</span>
            </div>
            <button onclick="deleteSong(event, ${song.id})" style="background:none; border:none; color:red;">Hapus</button>
        `;
        listDiv.appendChild(item);
    });
}

// 5. Player Logic
function playSong(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const song = playlist[index];
    
    const blob = new Blob([song.data], { type: song.type });
    const url = URL.createObjectURL(blob);
    
    currentAudio.src = url;
    currentAudio.play().catch(() => {
        alert("Klik layar sekali untuk mengaktifkan suara browser.");
    });

    document.getElementById('playerBar').style.display = 'block';
    document.getElementById('playerTitle').innerText = song.name;
    updateMediaSession(song);
    
    currentAudio.ontimeupdate = () => {
        const slider = document.getElementById('seekSlider');
        const current = document.getElementById('currentTime');
        const dur = document.getElementById('durationTime');
        
        slider.value = (currentAudio.currentTime / currentAudio.duration) * 100 || 0;
        current.innerText = formatTime(currentAudio.currentTime);
        dur.innerText = formatTime(currentAudio.duration);
    };

    currentAudio.onended = () => nextTrack();
}

function togglePlay() {
    const btn = document.getElementById('playPauseBtn');
    if (currentAudio.paused) {
        currentAudio.play();
        btn.innerText = "⏸";
    } else {
        currentAudio.pause();
        btn.innerText = "▶";
    }
}

function stopAudio() {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById('playerBar').style.display = 'none';
}

function nextTrack() { playSong(currentIndex + 1); }
function prevTrack() { playSong(currentIndex - 1); }

// 6. Media Session (Browser Control Panel)
function updateMediaSession(song) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.name,
            artist: "PlayMusic - Daus XD",
            artwork: [{ src: 'favicon.png', sizes: '512x512', type: 'image/png' }]
        });
        
        navigator.mediaSession.setActionHandler('play', () => togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    }
}

// 7. Helper & UI
function formatTime(sec) {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function togglePopup(show) {
    document.getElementById('uploadPopup').style.display = show ? 'flex' : 'none';
    if(!show) {
        document.getElementById('progressContainer').style.display = 'none';
        document.getElementById('fileInput').value = "";
    }
}

function deleteSong(event, id) {
    event.stopPropagation();
    if (confirm("Hapus audio ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => loadSongs();
    }
}

// Search & Filter
document.getElementById('searchInput').oninput = (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = playlist.filter(s => s.name.toLowerCase().includes(val));
    renderList(filtered);
};

document.getElementById('filterSelect').onchange = (e) => {
    let sorted = [...playlist];
    if (e.target.value === 'terlama') sorted.reverse();
    if (e.target.value === 'az') sorted.sort((a,b) => a.name.localeCompare(b.name));
    renderList(sorted);
};
