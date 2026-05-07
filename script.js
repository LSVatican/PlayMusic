let db;
const request = indexedDB.open("PlayMusicDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    displaySongs();
    checkAudioPermission();
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let currentAudio = new Audio();
let playlist = [];
let currentIndex = -1;

// --- DOM Elements ---
const uploadModal = document.getElementById('uploadModal');
const permissionModal = document.getElementById('permissionModal');
const audioList = document.getElementById('audioList');
const searchInput = document.getElementById('searchInput');

// --- Perizinan Suara ---
function checkAudioPermission() {
    if (localStorage.getItem('audioPermitted') !== 'true') {
        permissionModal.style.display = 'block';
    }
}

document.getElementById('grantPermissionBtn').onclick = () => {
    audioContext.resume().then(() => {
        localStorage.setItem('audioPermitted', 'true');
        permissionModal.style.display = 'none';
    });
};

// --- Unggah Audio ---
document.getElementById('openUploadBtn').onclick = () => uploadModal.style.display = 'block';
document.querySelector('.close').onclick = () => uploadModal.style.display = 'none';

document.getElementById('startUploadBtn').onclick = () => {
    const file = document.getElementById('audioFileInput').files[0];
    if (!file) return alert("Pilih file!");

    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp3'];
    if (!allowedTypes.includes(file.type)) return alert("Format tidak didukung!");

    const reader = new FileReader();
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');

    progressContainer.style.display = 'block';

    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = percent + '%';
            progressBar.innerText = percent + '%';
        }
    };

    reader.onload = (e) => {
        const songData = {
            title: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            date: new Date().toLocaleString(),
            blob: e.target.result,
            lastPlayed: 0
        };

        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").add(songData);

        transaction.oncomplete = () => {
            uploadModal.style.display = 'none';
            progressContainer.style.display = 'none';
            displaySongs();
        };
    };

    reader.readAsDataURL(file);
};

// --- Display & Filter ---
async function displaySongs(filter = "terbaru", query = "") {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        let songs = request.result;
        playlist = songs;

        // Pencarian
        if (query) {
            songs = songs.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
        }

        // Filter
        if (filter === "terbaru") songs.sort((a, b) => b.id - a.id);
        if (filter === "terlama") songs.sort((a, b) => a.id - b.id);
        if (filter === "terakhir") songs.sort((a, b) => b.lastPlayed - a.lastPlayed);

        audioList.innerHTML = "";
        songs.forEach((song, index) => {
            const div = document.createElement('div');
            div.className = "audio-item";
            div.innerHTML = `
                <div class="audio-info" onclick="playSong(${song.id})">
                    <h4>${song.title}</h4>
                    <p>${song.size} | Diunggah: ${song.date}</p>
                </div>
                <button class="glow-btn" style="padding:5px 10px" onclick="deleteSong(${song.id})">Hapus</button>
            `;
            audioList.appendChild(div);
        });
    };
}

// --- Player Logic ---
function playSong(id) {
    const transaction = db.transaction(["songs"], "readwrite");
    const store = transaction.objectStore("songs");
    store.get(id).onsuccess = (e) => {
        const song = e.target.result;
        currentAudio.src = song.blob;
        currentAudio.play();
        
        document.getElementById('bottomPlayer').style.display = 'flex';
        document.getElementById('currentTitle').innerText = song.title;
        document.getElementById('playPauseBtn').innerText = "⏸";

        // Update last played
        song.lastPlayed = Date.now();
        store.put(song);
        currentIndex = playlist.findIndex(s => s.id === id);
    };
}

document.getElementById('playPauseBtn').onclick = () => {
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById('playPauseBtn').innerText = "⏸";
    } else {
        currentAudio.pause();
        document.getElementById('playPauseBtn').innerText = "▶";
    }
};

document.getElementById('stopBtn').onclick = () => {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById('bottomPlayer').style.display = 'none';
};

function deleteSong(id) {
    if (confirm("Hapus audio ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => displaySongs();
    }
}

// Search & Filter Listeners
searchInput.oninput = () => displaySongs(document.getElementById('filterSelect').value, searchInput.value);
document.getElementById('filterSelect').onchange = (e) => displaySongs(e.target.value, searchInput.value);
