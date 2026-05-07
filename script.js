let db;
const request = indexedDB.open("PlayMusicDB", 1);
const audio = document.getElementById('mainAudio');
let playlist = [];
let currentIndex = -1;

// Inisialisasi Database
request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    loadSongs();
};

// Cek Perizinan Audio Browser
window.addEventListener('load', () => {
    if (localStorage.getItem('audioAllowed') !== 'true') {
        document.getElementById('permissionModal').style.display = 'block';
    }
});

document.getElementById('grantPermission').onclick = () => {
    localStorage.setItem('audioAllowed', 'true');
    document.getElementById('permissionModal').style.display = 'none';
};

// Fungsi Unggah
document.getElementById('openUploadBtn').onclick = () => document.getElementById('uploadModal').style.display = 'block';
document.getElementById('closeUpload').onclick = () => document.getElementById('uploadModal').style.display = 'none';

document.getElementById('uploadBtn').onclick = async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) return alert("Pilih file dulu!");

    const validFormats = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validFormats.includes(file.type)) return alert("Format tidak didukung!");

    document.getElementById('progressContainer').style.display = 'block';
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        document.getElementById('progressBar').style.width = progress + '%';
        document.getElementById('progressText').innerText = progress + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            saveToDB(file);
        }
    }, 200);
};

function saveToDB(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const transaction = db.transaction(["songs"], "readwrite");
        const song = {
            title: file.name,
            data: e.target.result,
            size: (file.size / 1024 / 1024).toFixed(2) + " MB",
            date: new Date().toLocaleString()
        };
        transaction.objectStore("songs").add(song);
        transaction.oncomplete = () => {
            document.getElementById('uploadModal').style.display = 'none';
            document.getElementById('progressContainer').style.display = 'none';
            loadSongs();
        };
    };
    reader.readAsDataURL(file);
}

// Load & Render List
function loadSongs() {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        playlist = request.result;
        renderList(playlist);
    };
}

function renderList(songs) {
    const listDiv = document.getElementById('audioList');
    listDiv.innerHTML = "";
    songs.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'audio-item';
        item.innerHTML = `
            <div class="audio-info" onclick="playSong(${index})">
                <h4>${song.title}</h4>
                <small>${song.size} • ${song.date}</small>
            </div>
            <button onclick="deleteSong(${song.id})" style="color:red; background:none; border:none; cursor:pointer;">Hapus</button>
        `;
        listDiv.appendChild(item);
    });
}

// Kontrol Pemutar
function playSong(index) {
    currentIndex = index;
    const song = playlist[index];
    audio.src = song.data;
    document.getElementById('currentTitle').innerText = song.title;
    document.getElementById('playerBar').style.display = 'block';
    audio.play();
    updateMediaSession(song.title);
}

document.getElementById('playPauseBtn').onclick = () => {
    if (audio.paused) audio.play();
    else audio.pause();
};

document.getElementById('nextBtn').onclick = () => {
    if (currentIndex < playlist.length - 1) playSong(currentIndex + 1);
};

document.getElementById('prevBtn').onclick = () => {
    if (currentIndex > 0) playSong(currentIndex - 1);
};

document.getElementById('stopBtn').onclick = () => {
    audio.pause();
    document.getElementById('playerBar').style.display = 'none';
};

// Update Progress Bar Slider
audio.ontimeupdate = () => {
    const slider = document.getElementById('seekSlider');
    const timeDisplay = document.getElementById('currentTimeDisplay');
    const current = formatTime(audio.currentTime);
    const duration = formatTime(audio.duration || 0);
    
    slider.value = (audio.currentTime / audio.duration) * 100 || 0;
    timeDisplay.innerText = `${current} / ${duration}`;
};

document.getElementById('seekSlider').oninput = (e) => {
    audio.currentTime = (e.target.value / 100) * audio.duration;
};

function formatTime(sec) {
    let min = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return `${min}:${s < 10 ? '0'+s : s}`;
}

// Media Session (Favicon di Control Center Browser)
function updateMediaSession(title) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: 'PlayMusic',
            album: 'Daus XD Collection',
            artwork: [{ src: '/Favicon.png', sizes: '512x512', type: 'image/png' }]
        });
    }
}

// Hapus Audio
window.deleteSong = (id) => {
    if (confirm("Hapus lagu ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => loadSongs();
    }
};

// Pencarian & Filter
document.getElementById('searchInput').oninput = (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = playlist.filter(s => s.title.toLowerCase().includes(val));
    renderList(filtered);
};
