// Konfigurasi Database
let db;
const request = indexedDB.open("PlayMusicDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    displaySongs();
};

// Variabel Global
const audio = new Audio();
let currentList = [];
let currentIndex = -1;

// Elemen DOM
const audioInput = document.getElementById('audioInput');
const audioList = document.getElementById('audioList');
const uploadModal = document.getElementById('uploadModal');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');

// Buka/Tutup Modal
document.getElementById('openUploadBtn').onclick = () => uploadModal.style.display = 'flex';
document.getElementById('closeUploadBtn').onclick = () => uploadModal.style.display = 'none';

// Fungsi Simpan Audio
audioInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    progressContainer.style.display = 'block';
    let progress = 0;
    
    // Simulasi Bar Proses (Karena IndexedDB lokal sangat cepat)
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
    const reader = new FileReader();
    reader.onload = (e) => {
        const transaction = db.transaction(["songs"], "readwrite");
        const song = {
            title: file.name,
            data: e.target.result,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            date: new Date().toLocaleString()
        };
        transaction.objectStore("songs").add(song);
        transaction.oncomplete = () => {
            uploadModal.style.display = 'none';
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
            audioInput.value = '';
            displaySongs();
        };
    };
    reader.readAsDataURL(file);
}

// Tampilkan List
function displaySongs(filter = '') {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        let songs = request.result;
        
        // Fitur Pencarian
        const searchTerm = document.getElementById('searchBar').value.toLowerCase();
        songs = songs.filter(s => s.title.toLowerCase().includes(searchTerm));

        // Fitur Filter
        const sortValue = document.getElementById('filterSelect').value;
        if (sortValue === 'terbaru') songs.reverse();

        currentList = songs;
        audioList.innerHTML = '';
        songs.forEach((song, index) => {
            const div = document.createElement('div');
            div.className = 'audio-item';
            div.innerHTML = `
                <div onclick="playSong(${index})">
                    <strong>${song.title}</strong><br>
                    <small>${song.size} | ${song.date}</small>
                </div>
                <button onclick="deleteSong(${song.id})">Hapus</button>
            `;
            audioList.appendChild(div);
        });
    };
}

// Fungsi Pemutar
function playSong(index) {
    currentIndex = index;
    const song = currentList[index];
    audio.src = song.data;
    audio.play().catch(() => {
        alert("Klik oke untuk mengaktifkan suara di browser ini.");
        audio.play();
    });

    document.getElementById('playerBar').style.display = 'flex';
    document.getElementById('playerTitle').innerText = song.title;
    document.getElementById('playPauseBtn').innerText = '⏸';

    // Media Session API (Untuk Panel Kontrol Browser)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: 'PlayMusic',
            artwork: [{ src: '/Favicon.png', sizes: '512x512', type: 'image/png' }]
        });
    }
}

// Update Waktu Real-time
audio.ontimeupdate = () => {
    const cur = formatTime(audio.currentTime);
    const dur = formatTime(audio.duration || 0);
    document.getElementById('playerTime').innerText = `${cur} / ${dur}`;
};

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
}

// Kontrol Player
document.getElementById('playPauseBtn').onclick = () => {
    if (audio.paused) {
        audio.play();
        document.getElementById('playPauseBtn').innerText = '⏸';
    } else {
        audio.pause();
        document.getElementById('playPauseBtn').innerText = '▶';
    }
};

document.getElementById('nextBtn').onclick = () => {
    if (currentIndex < currentList.length - 1) playSong(currentIndex + 1);
};

document.getElementById('prevBtn').onclick = () => {
    if (currentIndex > 0) playSong(currentIndex - 1);
};

document.getElementById('stopBtn').onclick = () => {
    audio.pause();
    document.getElementById('playerBar').style.display = 'none';
};

// Hapus Audio
function deleteSong(id) {
    if (confirm("Hapus audio ini?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => displaySongs();
    }
}

// Event Pencarian & Filter
document.getElementById('searchBar').oninput = () => displaySongs();
document.getElementById('filterSelect').onchange = () => displaySongs();
