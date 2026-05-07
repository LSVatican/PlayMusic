let db;
let currentPlaylist = [];
let currentIndex = -1;
const audioObj = new Audio();

// Inisialisasi IndexedDB (Untuk simpan file audio permanen)
const request = indexedDB.open("PlayMusicDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    loadSongs();
};

// Cek Izin Suara (Autoplay Policy)
if (localStorage.getItem('audioPermit') === 'true') {
    document.getElementById('permissionOverlay').style.display = 'none';
}

document.getElementById('enableAudioBtn').addEventListener('click', () => {
    localStorage.setItem('audioPermit', 'true');
    document.getElementById('permissionOverlay').style.display = 'none';
});

// Modal Logic
const modal = document.getElementById('uploadModal');
document.getElementById('openUploadBtn').onclick = () => modal.style.display = 'block';
function closeModal() { modal.style.display = 'none'; }

// Proses Unggah
document.getElementById('fileInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validTypes.includes(file.type)) {
        alert("Format harus MP3, WAV, atau OGG!");
        return;
    }

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    progressContainer.style.display = 'block';

    // Simulasi Progress Bar (Karena IndexedDB lokal sangat cepat)
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + '%';
        progressBar.innerText = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            saveToDB(file);
        }
    }, 100);
};

function saveToDB(file) {
    const transaction = db.transaction(["songs"], "readwrite");
    const store = transaction.objectStore("songs");
    
    const songData = {
        name: file.name,
        type: file.type,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        date: new Date().toLocaleString(),
        blob: file
    };

    store.add(songData);
    transaction.oncomplete = () => {
        closeModal();
        loadSongs();
        document.getElementById('progressContainer').style.display = 'none';
    };
}

// Load List Lagu
function loadSongs() {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
        currentPlaylist = getAll.result;
        renderList(currentPlaylist);
    };
}

function renderList(songs) {
    const list = document.getElementById('audioList');
    list.innerHTML = "";

    songs.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'audio-item';
        item.innerHTML = `
            <div onclick="playTrack(${index})">
                <strong>${song.name}</strong><br>
                <small>${song.size} | ${song.date}</small>
            </div>
            <button onclick="deleteSong(${song.id})" style="color:red; border:none; background:none;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        list.appendChild(item);
    });
}

// Control Pemutar
function playTrack(index) {
    if (index < 0 || index >= currentPlaylist.length) return; // Keamanan agar tidak error
    
    currentIndex = index;
    const song = currentPlaylist[index];
    const url = URL.createObjectURL(song.blob);
    
    audioObj.src = url;
    audioObj.play();
    
    document.getElementById('playerBar').style.display = 'block';
    document.getElementById('playerTitle').innerText = song.name;
    updatePlayBtn(true);
    
    // SETUP MEDIA SESSION (Panel Kontrol Browser)
    if ('mediaSession' in navigator) {
        // 1. Set Informasi Lagu
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.name,
            artist: 'PlayMusic - Daus XD',
            album: 'Koleksi Saya',
            artwork: [
                { src: 'favicon.png', sizes: '96x96', type: 'image/png' },
                { src: 'favicon.png', sizes: '512x512', type: 'image/png' }
            ]
        });

        // 2. Hubungkan Tombol Panel Browser ke Fungsi Kita
        navigator.mediaSession.setActionHandler('play', () => {
            audioObj.play();
            updatePlayBtn(true);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            audioObj.pause();
            updatePlayBtn(false);
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            prevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            nextTrack();
        });
    }
}

function togglePlay() {
    if (audioObj.paused) {
        audioObj.play();
        updatePlayBtn(true);
    } else {
        audioObj.pause();
        updatePlayBtn(false);
    }
}

function updatePlayBtn(isPlaying) {
    const btn = document.getElementById('playPauseBtn');
    btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

function nextTrack() {
    if (currentIndex < currentPlaylist.length - 1) playTrack(currentIndex + 1);
}

function prevTrack() {
    if (currentIndex > 0) playTrack(currentIndex - 1);
}

function stopAudio() {
    audioObj.pause();
    document.getElementById('playerBar').style.display = 'none';
}

function deleteSong(id) {
    if (confirm("Hapus audio ini?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => loadSongs();
    }
}

// Search & Filter
document.getElementById('searchInput').oninput = (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = currentPlaylist.filter(s => s.name.toLowerCase().includes(keyword));
    renderList(filtered);
};

// Update durasi real-time
audioObj.ontimeupdate = () => {
    const cur = formatTime(audioObj.currentTime);
    const dur = formatTime(audioObj.duration || 0);
    document.getElementById('playerTime').innerText = `${cur} / ${dur}`;
};

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Fitur otomatis putar lagu selanjutnya jika lagu habis
audioObj.onended = () => {
    // Cek apakah masih ada lagu selanjutnya
    if (currentIndex < currentPlaylist.length - 1) {
        nextTrack();
    } else {
        // Jika sudah lagu terakhir, kembali ke lagu pertama (opsional)
        playTrack(0); 
    }
};
