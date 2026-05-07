let db;
let currentAudio = new Audio();
let audioList = [];
let currentIndex = -1;

// Inisialisasi IndexedDB
const request = indexedDB.open("PlayMusicDB", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};
request.onsuccess = (e) => {
    db = e.target.result;
    loadSongs();
    checkAudioPermission();
};

// Cek Izin Suara
function checkAudioPermission() {
    if (localStorage.getItem('audioAllowed') === 'true') {
        document.getElementById('permissionModal').style.display = 'none';
    } else {
        document.getElementById('permissionModal').style.display = 'block';
    }
}

document.getElementById('grantPermissionBtn').onclick = () => {
    localStorage.setItem('audioAllowed', 'true');
    document.getElementById('permissionModal').style.display = 'none';
    // Dummy play to unlock audio context
    currentAudio.play().catch(() => {});
};

// Format Ukuran File
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Unggah Audio
document.getElementById('audioInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const modal = document.getElementById('uploadModal');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressContainer = document.getElementById('progressContainer');

    progressContainer.style.display = 'block';
    
    // Simulasi Progress Bar (Karena IndexedDB cepat, kita buat animasi)
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + '%';
        progressText.innerText = progress + '%';

        if (progress >= 100) {
            clearInterval(interval);
            const reader = new FileReader();
            reader.onload = (event) => {
                const songData = {
                    title: file.name,
                    size: formatBytes(file.size),
                    data: event.target.result,
                    type: file.type,
                    date: new Date().toLocaleString()
                };
                
                const transaction = db.transaction(["songs"], "readwrite");
                transaction.objectStore("songs").add(songData);
                transaction.oncomplete = () => {
                    modal.style.display = 'none';
                    progressContainer.style.display = 'none';
                    progressBar.style.width = '0%';
                    loadSongs();
                };
            };
            reader.readAsDataURL(file);
        }
    }, 100);
};

// Render Lagu
function loadSongs() {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        audioList = request.result;
        renderList(audioList);
    };
}

function renderList(list) {
    const container = document.getElementById('audioList');
    container.innerHTML = '';
    
    list.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'audio-item';
        item.innerHTML = `
            <div class="audio-info" onclick="playSong(${index})">
                <h4>${song.title}</h4>
                <small>${song.size} | ${song.date}</small>
            </div>
            <button onclick="deleteSong(${song.id})" style="background:none; border:none; color:red; cursor:pointer;">Hapus</button>
        `;
        container.appendChild(item);
    });
}

// Kontrol Pemutar
function playSong(index) {
    currentIndex = index;
    const song = audioList[currentIndex];
    currentAudio.src = song.data;
    currentAudio.play();
    
    document.getElementById('playerBar').style.display = 'flex';
    document.getElementById('currentTitle').innerText = song.title;
    document.getElementById('playPauseBtn').innerText = '⏸';

    // Media Session API (Untuk Favicon di Control Center Browser)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: 'PlayMusic - Daus XD',
            artwork: [{ src: '/Favicon.png', sizes: '512x512', type: 'image/png' }]
        });
    }
}

// Update Waktu Real-time
currentAudio.ontimeupdate = () => {
    const cur = formatTime(currentAudio.currentTime);
    const dur = formatTime(currentAudio.duration || 0);
    document.getElementById('currentTimeDisplay').innerText = `${cur} / ${dur}`;
};

function formatTime(secs) {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
}

// Tombol Play/Pause
document.getElementById('playPauseBtn').onclick = () => {
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById('playPauseBtn').innerText = '⏸';
    } else {
        currentAudio.pause();
        document.getElementById('playPauseBtn').innerText = '▶';
    }
};

// Stop/Close
document.getElementById('stopBtn').onclick = () => {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById('playerBar').style.display = 'none';
};

// Hapus Lagu
function deleteSong(id) {
    if (confirm("Hapus audio ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => loadSongs();
    }
}

// Search & Filter (Sederhana)
document.getElementById('searchInput').oninput = (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = audioList.filter(s => s.title.toLowerCase().includes(val));
    renderList(filtered);
};

// Modal Logic
document.getElementById('openUploadBtn').onclick = () => document.getElementById('uploadModal').style.display = 'block';
document.querySelector('.close-modal').onclick = () => document.getElementById('uploadModal').style.display = 'none';
