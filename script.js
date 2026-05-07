// Konfigurasi Database IndexedDB
let db;
const request = indexedDB.open("PlayMusicDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    renderList();
    checkAudioPermission();
};

// State Pemutar
let currentAudio = new Audio();
let playlist = [];
let currentIndex = -1;

// Perizinan Suara Browser
function checkAudioPermission() {
    if (navigator.userActivation && !navigator.userActivation.isActive) {
        alert("Ketuk di mana saja pada layar untuk memberikan izin suara browser.");
    }
}

// Fitur Unggah dengan Progress Bar
const uploadModal = document.getElementById('uploadModal');
document.getElementById('openUploadBtn').onclick = () => uploadModal.style.display = 'block';
document.getElementById('closeModalBtn').onclick = () => uploadModal.style.display = 'none';

document.getElementById('audioInput').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    progressContainer.style.display = 'block';

    const reader = new FileReader();
    
    reader.onprogress = (data) => {
        if (data.lengthComputable) {
            const progress = Math.round((data.loaded / data.total) * 100);
            progressBar.style.width = progress + '%';
            progressBar.innerHTML = progress + '%';
        }
    };

    reader.onload = (event) => {
        const songData = {
            title: file.name,
            data: event.target.result,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            date: new Date().toLocaleString(),
            timestamp: Date.now()
        };

        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").add(songData);
        
        transaction.oncomplete = () => {
            uploadModal.style.display = 'none';
            progressContainer.style.display = 'none';
            renderList();
        };
    };

    reader.readAsDataURL(file);
};

// Render List Audio
function renderList() {
    const list = document.getElementById('audioList');
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filter = document.getElementById('filterSelect').value;

    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        let songs = request.result;
        playlist = songs;

        // Pencarian
        songs = songs.filter(s => s.title.toLowerCase().includes(search));

        // Filter
        if (filter === "terbaru") songs.sort((a, b) => b.timestamp - a.timestamp);
        if (filter === "terlama") songs.sort((a, b) => a.timestamp - b.timestamp);

        list.innerHTML = "";
        songs.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'audio-item';
            item.innerHTML = `
                <div>
                    <strong>${song.title}</strong><br>
                    <small>${song.size} | ${song.date}</small>
                </div>
                <button onclick="deleteSong(event, ${song.id})" style="background:red; color:white; border:none; padding:5px;">Hapus</button>
            `;
            item.onclick = () => playSong(index);
            list.appendChild(item);
        });
    };
}

// Kontrol Pemutar
function playSong(index) {
    currentIndex = index;
    const song = playlist[currentIndex];
    currentAudio.src = song.data;
    currentAudio.play();
    
    document.getElementById('playerBar').style.display = 'flex';
    document.getElementById('playerTitle').innerText = song.title;
    
    // Media Session API (Favicon & Kontrol di Panel Browser)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: 'PlayMusic - Daus XD',
            artwork: [{ src: '/Favicon.png', sizes: '96x96', type: 'image/png' }]
        });
    }

    updatePlayPauseBtn();
}

function updatePlayPauseBtn() {
    const btn = document.getElementById('playPauseBtn');
    btn.innerText = currentAudio.paused ? "▶" : "⏸";
}

document.getElementById('playPauseBtn').onclick = () => {
    if (currentAudio.paused) currentAudio.play();
    else currentAudio.pause();
    updatePlayPauseBtn();
};

document.getElementById('nextBtn').onclick = () => {
    if (currentIndex < playlist.length - 1) playSong(currentIndex + 1);
};

document.getElementById('prevBtn').onclick = () => {
    if (currentIndex > 0) playSong(currentIndex - 1);
};

document.getElementById('stopBtn').onclick = () => {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById('playerBar').style.display = 'none';
};

// Durasi Real-time
currentAudio.ontimeupdate = () => {
    const cur = formatTime(currentAudio.currentTime);
    const dur = formatTime(currentAudio.duration || 0);
    document.getElementById('playerDuration').innerText = `${cur} / ${dur}`;
};

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
}

// Hapus Audio
window.deleteSong = (e, id) => {
    e.stopPropagation();
    if (confirm("Hapus audio ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => renderList();
    }
};

// Event Pencarian & Filter
document.getElementById('searchInput').oninput = renderList;
document.getElementById('filterSelect').onchange = renderList;
