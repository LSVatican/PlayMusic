let db;
const request = indexedDB.open("PlayMusicDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    checkPermission();
    loadSongs();
};

const audioPlayer = new Audio();
let currentSongsList = [];
let currentIndex = -1;

// Perizinan Browser
function checkPermission() {
    if (localStorage.getItem('audioAllowed')) {
        document.getElementById('permissionModal').style.display = 'none';
    } else {
        document.getElementById('permissionModal').style.display = 'block';
    }
}

document.getElementById('grantPermission').onclick = () => {
    localStorage.setItem('audioAllowed', true);
    checkPermission();
};

// Logika Unggah dengan Progress Bar
document.getElementById('audioInput').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    progressContainer.style.display = 'block';

    reader.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percent + '%';
            progressText.innerText = percent + '%';
        }
    };

    reader.onload = (event) => {
        const songData = {
            title: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            date: new Date().toLocaleString(),
            data: event.target.result,
            timestamp: Date.now()
        };

        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").add(songData);

        transaction.oncomplete = () => {
            progressContainer.style.display = 'none';
            document.getElementById('uploadModal').style.display = 'none';
            loadSongs();
        };
    };
    reader.readAsDataURL(file);
};

// Load Audio List
function loadSongs(filter = 'terbaru', search = '') {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        let songs = request.result;

        // Pencarian
        if (search) {
            songs = songs.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
        }

        // Filter
        if (filter === 'terbaru') songs.sort((a, b) => b.timestamp - a.timestamp);
        if (filter === 'terlama') songs.sort((a, b) => a.timestamp - b.timestamp);

        currentSongsList = songs;
        renderList(songs);
    };
}

function renderList(songs) {
    const list = document.getElementById('audioList');
    list.innerHTML = '';
    songs.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'audio-item';
        item.innerHTML = `
            <div onclick="playSong(${index})">
                <strong>${song.title}</strong><br>
                <small>${song.size} | ${song.date}</small>
            </div>
            <button onclick="deleteSong(${song.id})" style="background:none; border:none; color:red; cursor:pointer;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        list.appendChild(item);
    });
}

// Player Logic
function playSong(index) {
    currentIndex = index;
    const song = currentSongsList[index];
    audioPlayer.src = song.data;
    audioPlayer.play();
    
    document.getElementById('bottomPlayer').style.display = 'block';
    document.getElementById('currentTitle').innerText = song.title;
    updateBtn(true);
}

function updateBtn(isPlaying) {
    const btn = document.getElementById('playPauseBtn');
    btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

document.getElementById('playPauseBtn').onclick = () => {
    if (audioPlayer.paused) {
        audioPlayer.play();
        updateBtn(true);
    } else {
        audioPlayer.pause();
        updateBtn(false);
    }
};

document.getElementById('stopBtn').onclick = () => {
    audioPlayer.pause();
    document.getElementById('bottomPlayer').style.display = 'none';
};

// Delete Logic
function deleteSong(id) {
    if (confirm("Hapus audio ini selamanya?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => loadSongs();
    }
}

// Modal & Search Events
document.getElementById('openUploadBtn').onclick = () => document.getElementById('uploadModal').style.display = 'block';
document.querySelector('.close-modal').onclick = () => document.getElementById('uploadModal').style.display = 'none';
document.getElementById('searchInput').oninput = (e) => loadSongs(document.getElementById('filterSelect').value, e.target.value);
document.getElementById('filterSelect').onchange = (e) => loadSongs(e.target.value, document.getElementById('searchInput').value);
