let db;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let currentAudio = new Audio();
let playlist = [];
let currentIndex = -1;

// 1. Inisialisasi IndexedDB (Agar file tidak hilang saat refresh)
const request = indexedDB.open("PlayMusicDB", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};
request.onsuccess = (e) => {
    db = e.target.result;
    loadSongs();
};

// 2. Perizinan Audio Browser
const overlay = document.getElementById('permissionOverlay');
document.getElementById('enableAudioBtn').onclick = () => {
    audioContext.resume().then(() => {
        overlay.style.display = 'none';
        localStorage.setItem('audioPermit', 'true');
    });
};

if(localStorage.getItem('audioPermit') === 'true') overlay.style.display = 'none';

// 3. Unggah Audio & Progress Bar
document.getElementById('openUploadBtn').onclick = () => {
    document.getElementById('uploadModal').style.display = 'flex';
};

document.getElementById('fileInput').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    const progress = document.getElementById('progressBar');
    document.getElementById('progressContainer').style.display = 'block';

    reader.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progress.style.width = percent + '%';
            progress.innerText = percent + '%';
        }
    };

    reader.onload = (event) => {
        const songData = {
            title: file.name,
            data: event.target.result,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            date: new Date().toLocaleString()
        };
        
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").add(songData);
        transaction.oncomplete = () => {
            document.getElementById('uploadModal').style.display = 'none';
            document.getElementById('progressContainer').style.display = 'none';
            loadSongs();
        };
    };
    reader.readAsArrayBuffer(file);
};

// 4. Load & Tampilkan List
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
    const list = document.getElementById('audioList');
    list.innerHTML = "";
    songs.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'audio-item';
        item.innerHTML = `
            <div class="audio-info" onclick="playSong(${index})">
                <h4>${song.title}</h4>
                <span>${song.size} | ${song.date}</span>
            </div>
            <button onclick="deleteSong(${song.id})" style="background:none; border:none; color:red;">🗑</button>
        `;
        list.appendChild(item);
    });
}

// 5. Kontrol Pemutar
function playSong(index) {
    if(index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const song = playlist[index];
    
    const blob = new Blob([song.data], { type: 'audio/mpeg' });
    currentAudio.src = URL.createObjectURL(blob);
    currentAudio.play();

    document.getElementById('playerBar').classList.remove('hidden');
    document.getElementById('currentTitle').innerText = song.title;
    document.getElementById('playPauseBtn').innerText = '⏸';

    // Media Session (Favicon di kontrol browser)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: 'Daus XD',
            album: 'PlayMusic',
            artwork: [{ src: '/Favicon.png', sizes: '512x512', type: 'image/png' }]
        });
    }
}

// Event Listeners
document.getElementById('playPauseBtn').onclick = () => {
    if(currentAudio.paused) {
        currentAudio.play();
        document.getElementById('playPauseBtn').innerText = '⏸';
    } else {
        currentAudio.pause();
        document.getElementById('playPauseBtn').innerText = '▶';
    }
};

currentAudio.ontimeupdate = () => {
    const seek = document.getElementById('seekBar');
    const timeDisplay = document.getElementById('currentTime');
    const current = formatTime(currentAudio.currentTime);
    const duration = formatTime(currentAudio.duration || 0);
    timeDisplay.innerText = `${current} / ${duration}`;
    seek.value = (currentAudio.currentTime / currentAudio.duration) * 100 || 0;
};

function formatTime(sec) {
    let m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0'+s : s}`;
}

function deleteSong(id) {
    if(confirm("Hapus audio ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => loadSongs();
    }
}

document.getElementById('closePlayerBtn').onclick = () => {
    currentAudio.pause();
    document.getElementById('playerBar').classList.add('hidden');
};

document.getElementById('nextBtn').onclick = () => playSong(currentIndex + 1);
document.getElementById('prevBtn').onclick = () => playSong(currentIndex - 1);

// 1. Fungsi klik tombol close
document.getElementById('closeUploadBtn').onclick = () => {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'none';
    
    // Opsional: Reset input file jika batal
    document.getElementById('fileInput').value = ""; 
    document.getElementById('progressContainer').style.display = 'none';
};

// 2. Fitur tambahan: Klik di luar kotak modal untuk menutup
window.onclick = (event) => {
    const modal = document.getElementById('uploadModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// Variabel global untuk menyimpan data asli agar pencarian lebih cepat
let allSongs = []; 

// 1. Fungsi Pencarian dan Filter Gabungan
function filterAndSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterValue = document.getElementById('filterSelect').value;
    const lastPlayedId = localStorage.getItem('lastPlayedId');

    // Salin data asli agar tidak merusak urutan database
    let filteredSongs = [...allSongs];

    // Logika Pencarian
    filteredSongs = filteredSongs.filter(song => 
        song.title.toLowerCase().includes(searchTerm)
    );

    // Logika Filter
    if (filterValue === "terbaru") {
        filteredSongs.sort((a, b) => b.id - a.id); // ID besar = baru diunggah
    } else if (filterValue === "terlama") {
        filteredSongs.sort((a, b) => a.id - b.id);
    } else if (filterValue === "terakhir") {
        // Pindahkan lagu yang terakhir diputar ke posisi paling atas
        if (lastPlayedId) {
            filteredSongs.sort((a, b) => {
                if (a.id == lastPlayedId) return -1;
                if (b.id == lastPlayedId) return 1;
                return 0;
            });
        }
    }

    // Tampilkan hasil filter ke layar
    renderList(filteredSongs);
}

// 2. Event Listeners untuk Input dan Select
document.getElementById('searchInput').addEventListener('input', filterAndSearch);
document.getElementById('filterSelect').addEventListener('change', filterAndSearch);

// 3. Update Fungsi loadSongs agar menyimpan data ke variabel allSongs
function loadSongs() {
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        allSongs = request.result; // Simpan ke variabel global
        filterAndSearch(); // Jalankan filter awal (default: terbaru)
    };
}

// 4. Update Fungsi playSong untuk menyimpan ID "Terakhir Diputar"
function playSong(index) {
    if(index < 0 || index >= playlist.length) return;
    
    currentIndex = index;
    const song = playlist[index];
    
    // Simpan ID lagu ke localStorage untuk fitur filter "Terakhir"
    localStorage.setItem('lastPlayedId', song.id);

    const blob = new Blob([song.data], { type: 'audio/mpeg' });
    currentAudio.src = URL.createObjectURL(blob);
    currentAudio.play();

    document.getElementById('playerBar').classList.remove('hidden');
    document.getElementById('currentTitle').innerText = song.title;
    document.getElementById('playPauseBtn').innerText = '⏸';
}
