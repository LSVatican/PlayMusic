let db;
let currentAudio = new Audio();
let audioList = [];
let currentIndex = -1;

// 1. Database Setup (IndexedDB) agar data tidak hilang
const request = indexedDB.open("PlayMusicDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
    db = e.target.result;
    loadList();
};

// 2. Perizinan Suara
const permissionOverlay = document.getElementById('permission-overlay');
if (localStorage.getItem('audioAllowed')) {
    permissionOverlay.style.display = 'none';
}

document.getElementById('btn-allow').addEventListener('click', () => {
    localStorage.setItem('audioAllowed', 'true');
    permissionOverlay.style.display = 'none';
});

// 3. Logic Unggah
const uploadPopup = document.getElementById('upload-popup');
const fileInput = document.getElementById('file-input');

document.getElementById('btn-open-upload').onclick = () => uploadPopup.style.display = 'flex';
document.getElementById('btn-close-upload').onclick = () => uploadPopup.style.display = 'none';

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
        alert("Format tidak didukung! Gunakan .mp3, .wav, atau .ogg");
        return;
    }

    document.getElementById('progress-container').style.display = 'block';
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        document.getElementById('progress-bar').style.width = progress + '%';
        document.getElementById('progress-text').innerText = progress + '%';
        
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
        const store = transaction.objectStore("songs");
        store.add({ 
            name: file.name, 
            data: e.target.result, 
            size: (file.size / 1024 / 1024).toFixed(2) + " MB" 
        });
        
        transaction.oncomplete = () => {
            uploadPopup.style.display = 'none';
            document.getElementById('progress-container').style.display = 'none';
            loadList();
        };
    };
    reader.readAsDataURL(file);
}

// 4. Render List
function loadList() {
    const container = document.getElementById('audio-list');
    container.innerHTML = "";
    const store = db.transaction("songs").objectStore("songs");
    audioList = [];

    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            audioList.push(cursor.value);
            const item = document.createElement('div');
            item.className = 'audio-item';
            item.innerHTML = `
                <div>
                    <strong class="glow-text">${cursor.value.name}</strong><br>
                    <small>${cursor.value.size}</small>
                </div>
                <button onclick="deleteAudio(${cursor.value.id}, event)">Hapus</button>
            `;
            item.onclick = () => playSong(audioList.length - 1);
            container.appendChild(item);
            cursor.continue();
        }
    };
}

// 5. Player Logic
function playSong(index) {
    currentIndex = index;
    const song = audioList[index];
    currentAudio.src = song.data;
    currentAudio.play();
    
    document.getElementById('player-bar').style.display = 'block';
    document.getElementById('current-title').innerText = song.name;
    document.getElementById('btn-play-pause').innerText = "⏸";
}

document.getElementById('btn-play-pause').onclick = () => {
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById('btn-play-pause').innerText = "⏸";
    } else {
        currentAudio.pause();
        document.getElementById('btn-play-pause').innerText = "▶";
    }
};

document.getElementById('btn-stop').onclick = () => {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById('player-bar').style.display = 'none';
};

document.getElementById('btn-next').onclick = () => {
    if (currentIndex < audioList.length - 1) playSong(currentIndex + 1);
};

document.getElementById('btn-prev').onclick = () => {
    if (currentIndex > 0) playSong(currentIndex - 1);
};

// 6. Hapus Data
window.deleteAudio = (id, event) => {
    event.stopPropagation();
    if (confirm("Hapus audio ini secara permanen?")) {
        const transaction = db.transaction(["songs"], "readwrite");
        transaction.objectStore("songs").delete(id);
        transaction.oncomplete = () => loadList();
    }
};

// Update Seek Bar
currentAudio.ontimeupdate = () => {
    const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
    document.getElementById('seek-bar').value = progress || 0;
};
