let db;
let currentAudio = new Audio();
let audioList = [];
let currentIndex = -1;

// Inisialisasi Database
const request = indexedDB.open("PlayMusicDB", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};
request.onsuccess = (e) => {
    db = e.target.result;
    checkAudioPermission();
    loadAudioList();
};

// Izin Audio Browser
function checkAudioPermission() {
    if (localStorage.getItem("audioPerm") === "granted") {
        document.getElementById("permissionOverlay").style.display = "none";
    }
}

function enableAudio() {
    localStorage.setItem("audioPerm", "granted");
    document.getElementById("permissionOverlay").style.display = "none";
}

// Unggah Audio
const audioInput = document.getElementById("audioInput");
audioInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    document.getElementById("progressWrapper").style.display = "block";

    reader.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            document.getElementById("progressBar").style.size = percent + "%"; // Custom Bar
            document.getElementById("progressBar").style.width = percent + "%";
            document.getElementById("progressText").innerText = percent + "%";
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
            toggleUploadModal(false);
            loadAudioList();
            document.getElementById("progressWrapper").style.display = "none";
        };
    };
    reader.readAsDataURL(file);
};

// Menampilkan List
async function loadAudioList() {
    const filter = document.getElementById("filterSelect").value;
    const transaction = db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = () => {
        audioList = request.result;
        
        // Logika Filter
        if(filter === "terbaru") audioList.sort((a,b) => b.timestamp - a.timestamp);
        if(filter === "terlama") audioList.sort((a,b) => a.timestamp - b.timestamp);
        if(filter === "ukuran") audioList.sort((a,b) => parseFloat(b.size) - parseFloat(a.size));

        renderUI(audioList);
    };
}

function renderUI(list) {
    const container = document.getElementById("audioList");
    container.innerHTML = "";
    list.forEach((song, index) => {
        container.innerHTML += `
            <div class="audio-item" onclick="playAudio(${index})">
                <div>
                    <strong>${song.title}</strong><br>
                    <small>${song.date} | ${song.size}</small>
                </div>
                <button onclick="confirmDelete(event, ${song.id})" class="btn-del">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        `;
    });
}

// Kontrol Pemutar
function playAudio(index) {
    currentIndex = index;
    const song = audioList[index];
    currentAudio.src = song.data;
    currentAudio.play();
    
    document.getElementById("playerBar").style.display = "flex";
    document.getElementById("playerTitle").innerText = "Memutar: " + song.title;
    document.getElementById("playBtn").innerHTML = '<i class="fa fa-pause"></i>';
    
    // TAMBAHKAN BARIS INI:
    updateMediaMetadata(song);
    
    updateDuration();
}

function togglePlay() {
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById("playBtn").innerHTML = '<i class="fa fa-pause"></i>';
    } else {
        currentAudio.pause();
        document.getElementById("playBtn").innerHTML = '<i class="fa fa-play"></i>';
    }
}

function updateDuration() {
    currentAudio.ontimeupdate = () => {
        const cur = formatTime(currentAudio.currentTime);
        const dur = formatTime(currentAudio.duration || 0);
        document.getElementById("playerTime").innerText = `${cur} / ${dur}`;
        document.getElementById("seekSlider").max = currentAudio.duration;
        document.getElementById("seekSlider").value = currentAudio.currentTime;
    };
}

function formatTime(sec) {
    let m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
}

function stopAudio() {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById("playerBar").style.display = "none";
}

// Fitur Hapus
function confirmDelete(e, id) {
    e.stopPropagation();
    if (confirm("Hapus audio ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => loadAudioList();
    }
}

// Pencarian
function searchAudio() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const filtered = audioList.filter(s => s.title.toLowerCase().includes(query));
    renderUI(filtered);
}

function toggleUploadModal(show) {
    document.getElementById("uploadModal").style.display = show ? "flex" : "none";
}

// --- FITUR PERBAIKAN NEXT & PREV ---

function playNext() {
    if (audioList.length === 0) return; // Jika list kosong, abaikan
    
    currentIndex++;
    
    // Jika sudah di akhir list, kembali ke awal (loop)
    if (currentIndex >= audioList.length) {
        currentIndex = 0;
    }
    
    playAudio(currentIndex);
}

function playPrev() {
    if (audioList.length === 0) return; // Jika list kosong, abaikan
    
    currentIndex--;
    
    // Jika di awal list, pindah ke audio paling terakhir
    if (currentIndex < 0) {
        currentIndex = audioList.length - 1;
    }
    
    playAudio(currentIndex);
}

// Fitur Tambahan: Otomatis putar lagu selanjutnya jika lagu sekarang selesai
currentAudio.onended = () => {
    playNext();
};

// --- MENGHUBUNGKAN KE KONTROL MEDIA BAWAAN BROWSER/SISTEM ---
if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => {
        togglePlay();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        togglePlay();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrev();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
    });
}

// Fungsi untuk memperbarui info lagu di panel browser
function updateMediaMetadata(song) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: 'Daus XD',
            album: 'PlayMusic',
            artwork: [
                { src: 'favicon.ico', sizes: '96x96', type: 'image/x-icon' },
                { src: '/Favicon.png', sizes: '128x128', type: 'image/png' },
                { src: '/Favicon.png', sizes: '192x192', type: 'image/png' },
                { src: '/Favicon.png', sizes: '256x256', type: 'image/png' },
                { src: '/Favicon.png', sizes: '384x384', type: 'image/png' },
                { src: '/Favicon.png', sizes: '512x512', type: 'image/png' }
            ]
        });
    }
}
