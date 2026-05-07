let audioDatabase = JSON.parse(localStorage.getItem('playMusicData')) || [];
let currentAudio = new Audio();
let currentIndex = -1;

// Perizinan Suara
window.onload = () => {
    if (!localStorage.getItem('audioPermission')) {
        document.getElementById('permissionOverlay').style.display = 'flex';
    }
    renderList();
};

function enableAudio() {
    localStorage.setItem('audioPermission', 'true');
    document.getElementById('permissionOverlay').style.display = 'none';
}

// Modal Logic
function openUploadModal() {
    document.getElementById('uploadModal').style.display = 'flex';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
}

// Proses Unggah
function handleUpload() {
    const fileInput = document.getElementById('audioInput');
    const file = fileInput.files[0];
    
    if (!file) return alert("Pilih file dulu!");
    
    const reader = new FileReader();
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');

    progressContainer.style.display = 'block';

    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = percent + '%';
            progressBar.innerHTML = percent + '%';
        }
    };

    reader.onload = (e) => {
        const newData = {
            id: Date.now(),
            title: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + " MB",
            time: new Date().toLocaleString(),
            src: e.target.result
        };
        
        audioDatabase.push(newData);
        saveAndRefresh();
        closeUploadModal();
        progressContainer.style.display = 'none';
    };

    reader.readAsDataURL(file);
}

function saveAndRefresh() {
    localStorage.setItem('playMusicData', JSON.stringify(audioDatabase));
    renderList();
}

// Render List & Filter
function renderList() {
    const list = document.getElementById('audioList');
    const search = document.getElementById('searchInput').value.toLowerCase();
    list.innerHTML = '';

    let filtered = audioDatabase.filter(item => item.title.toLowerCase().includes(search));

    filtered.forEach((item, index) => {
        list.innerHTML += `
            <div class="audio-item">
                <div onclick="playAudio(${index})">
                    <strong>${item.title}</strong><br>
                    <small>${item.size} | ${item.time}</small>
                </div>
                <button onclick="deleteAudio(${index})" style="background:none; border:none; color:red; cursor:pointer;">🗑</button>
            </div>
        `;
    });
}

// Player Logic
function playAudio(index) {
    currentIndex = index;
    const item = audioDatabase[index];
    currentAudio.src = item.src;
    currentAudio.play();
    
    document.getElementById('playerBar').style.display = 'flex';
    document.getElementById('currentTitle').innerText = item.title;
    document.getElementById('playPauseBtn').innerText = '⏸';
}

function togglePlay() {
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById('playPauseBtn').innerText = '⏸';
    } else {
        currentAudio.pause();
        document.getElementById('playPauseBtn').innerText = '▶';
    }
}

function stopAudio() {
    currentAudio.pause();
    document.getElementById('playerBar').style.display = 'none';
}

function deleteAudio(index) {
    if (confirm("Hapus audio ini selamanya?")) {
        audioDatabase.splice(index, 1);
        saveAndRefresh();
    }
}

// Search & Filter Listeners
document.getElementById('searchInput').oninput = renderList;
