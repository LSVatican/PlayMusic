let db;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let currentAudio = new Audio();
let playlist = [];
let currentIndex = -1;

// 1. Inisialisasi Database
const request = indexedDB.open("PlayMusicDB", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};
request.onsuccess = (e) => {
    db = e.target.result;
    displaySongs();
};

// 2. Perizinan Browser
window.addEventListener('load', () => {
    if (localStorage.getItem('audioAllowed')) {
        document.getElementById('permissionModal').style.display = 'none';
    } else {
        document.getElementById('permissionModal').style.display = 'block';
    }
});

document.getElementById('allowAudioBtn').onclick = () => {
    audioContext.resume().then(() => {
        localStorage.setItem('audioAllowed', 'true');
        document.getElementById('permissionModal').style.display = 'none';
    });
};

// 3. Fungsi Unggah & Progress Bar
document.getElementById('audioFile').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const validFormats = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validFormats.includes(file.type)) {
        alert("Format tidak didukung!");
        return;
    }

    const progContainer = document.getElementById('progressContainer');
    const progBar = document.getElementById('progressBar');
    progContainer.style.display = 'block';

    // Simulasi Progress Bar
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progBar.style.width = progress + '%';
        progBar.innerText = progress + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            saveToDB(file);
        }
    }, 100);
};

function saveToDB(file) {
    const transaction = db.transaction(["songs"], "readwrite");
    const store = transaction.objectStore("songs");
    
    const newSong = {
        name: file.name,
        data: file,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        date: new Date().toLocaleString()
    };

    store.add(newSong);
    transaction.oncomplete = () => {
        document.getElementById('uploadModal').style.display = 'none';
        document.getElementById('progressContainer').style.display = 'none';
        displaySongs();
    };
}

// 4. Tampilkan List & Filter
function displaySongs() {
    const container = document.getElementById('audioList');
    container.innerHTML = "";
    const filter = document.getElementById('filterSelect').value;
    const search = document.getElementById('searchInput').value.toLowerCase();

    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        let songs = request.result;
        playlist = songs;

        // Pencarian
        songs = songs.filter(s => s.name.toLowerCase().includes(search));

        // Sorting
        if (filter === "nama") songs.sort((a,b) => a.name.localeCompare(b.name));
        if (filter === "terlama") songs.reverse();

        songs.forEach((song, index) => {
            const div = document.createElement('div');
            div.className = "audio-item";
            div.innerHTML = `
                <div onclick="playSong(${song.id})">
                    <strong>${song.name}</strong><br>
                    <small>${song.size} | ${song.date}</small>
                </div>
                <button onclick="deleteSong(${song.id})" style="background:red; color:white; border:none; padding:5px;">Hapus</button>
            `;
            container.appendChild(div);
        });
    };
}

// 5. Player Controls
function playSong(id) {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.get(id);

    request.onsuccess = () => {
        const song = request.result;
        const url = URL.createObjectURL(song.data);
        currentAudio.src = url;
        currentAudio.play();
        
        document.getElementById('playerBar').style.display = 'block';
        document.getElementById('currentTitle').innerText = song.name;
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

document.getElementById('closePlayer').onclick = () => {
    currentAudio.pause();
    document.getElementById('playerBar').style.display = 'none';
};

// 6. Hapus Audio
function deleteSong(id) {
    if (confirm("Hapus lagu ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => displaySongs();
    }
}

// Search & Filter Event
document.getElementById('searchInput').oninput = displaySongs;
document.getElementById('filterSelect').onchange = displaySongs;

// Modal Open/Close Logic
document.getElementById('openUploadBtn').onclick = () => document.getElementById('uploadModal').style.display = 'block';
document.querySelector('.close').onclick = () => document.getElementById('uploadModal').style.display = 'none';
