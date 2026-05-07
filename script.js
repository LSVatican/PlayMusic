let db;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let currentAudio = new Audio();
let playlist = [];
let currentIndex = -1;

// Inisialisasi Database
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
    if (localStorage.getItem("audioPermitted") !== "true") {
        document.getElementById("permissionModal").style.display = "block";
    }
}

document.getElementById("grantPermission").onclick = () => {
    audioContext.resume().then(() => {
        localStorage.setItem("audioPermitted", "true");
        document.getElementById("permissionModal").style.display = "none";
    });
};

// Modal Logic
const uploadModal = document.getElementById("uploadModal");
document.getElementById("openUploadBtn").onclick = () => uploadModal.style.display = "block";
document.querySelector(".close-btn").onclick = () => uploadModal.style.display = "none";

// Proses Unggah
document.getElementById("startUploadBtn").onclick = async () => {
    const fileInput = document.getElementById("audioFileInput");
    const file = fileInput.files[0];
    if (!file) return alert("Pilih file terlebih dahulu!");

    const progressContainer = document.getElementById("progressContainer");
    const progressBar = document.getElementById("progressBar");
    progressContainer.style.display = "block";

    // Simulasi Progress Bar berdasarkan ukuran (karena IndexedDB cepat)
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        progressBar.style.width = progress + "%";
        progressBar.innerText = progress + "%";
        if (progress >= 100) {
            clearInterval(interval);
            saveToDB(file);
        }
    }, 50);
};

function saveToDB(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const transaction = db.transaction(["songs"], "readwrite");
        const store = transaction.objectStore("songs");
        
        const songData = {
            title: file.name,
            data: e.target.result,
            size: (file.size / 1024 / 1024).toFixed(2) + " MB",
            date: new Date().toLocaleString(),
            type: file.type
        };

        store.add(songData);
        transaction.oncomplete = () => {
            uploadModal.style.display = "none";
            document.getElementById("progressContainer").style.display = "none";
            loadSongs();
        };
    };
    reader.readAsDataURL(file);
}

// Load dan Tampilkan Lagu
function loadSongs() {
    const store = db.transaction("songs").objectStore("songs");
    const list = document.getElementById("audioList");
    list.innerHTML = "";
    playlist = [];

    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            playlist.push(cursor.value);
            renderSongItem(cursor.value);
            cursor.continue();
        }
    };
}

function renderSongItem(song) {
    const div = document.createElement("div");
    div.className = "audio-item";
    div.innerHTML = `
        <div>
            <strong>${song.title}</strong><br>
            <small>${song.size} | ${song.date}</small>
        </div>
        <button onclick="deleteSong(event, ${song.id})" style="background:none; border:none; color:pink; cursor:pointer;">Hapus</button>
    `;
    div.onclick = () => playSong(song.id);
    document.getElementById("audioList").appendChild(div);
}

// Player Control
function playSong(id) {
    const song = playlist.find(s => s.id === id);
    currentIndex = playlist.indexOf(song);
    
    currentAudio.src = song.data;
    currentAudio.play();
    
    document.getElementById("playerBar").style.display = "block";
    document.getElementById("currentTitle").innerText = song.title;
    document.getElementById("playPauseBtn").innerText = "⏸";
}

document.getElementById("playPauseBtn").onclick = () => {
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById("playPauseBtn").innerText = "⏸";
    } else {
        currentAudio.pause();
        document.getElementById("playPauseBtn").innerText = "▶";
    }
};

document.getElementById("stopBtn").onclick = () => {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById("playerBar").style.display = "none";
};

// Fitur Hapus dengan Konfirmasi
function deleteSong(event, id) {
    event.stopPropagation();
    if (confirm("Apakah Anda yakin ingin menghapus lagu ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => loadSongs();
    }
}
