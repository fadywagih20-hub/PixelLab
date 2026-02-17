// --- Elements for Background Removal Tool ---
const fileInput = document.getElementById('file-input');
const uploadContent = document.getElementById('upload-content');
const processingContent = document.getElementById('processing-content');
const resultContent = document.getElementById('result-content');
const originalPreview = document.getElementById('original-preview');
const resultImage = document.getElementById('result-image');
const resultContainer = document.getElementById('result-container');
const downloadBtn = document.getElementById('download-btn');
const dropZone = document.getElementById('drop-zone');
const progressPercentage = document.getElementById('progress-percentage');
const progressBar = document.getElementById('progress-bar');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const bgOptions = document.querySelectorAll('.color-btn, .img-btn');
const suggestionCard = document.getElementById('suggestion-card');

// --- Elements for Quality Tool ---
const qualityFileInput = document.getElementById('quality-file-input');
const qualityUploadContent = document.getElementById('quality-upload-content');
const qualityProcessingContent = document.getElementById('quality-processing-content');
const qualityResultContent = document.getElementById('quality-result-content');
const qualityOriginalImg = document.getElementById('quality-original-img');
const qualityResultImg = document.getElementById('quality-result-img');
const qualityDownloadBtn = document.getElementById('quality-download-btn');
const qualityProgressBar = document.getElementById('quality-progress-bar');
const qualityProgressPercentage = document.getElementById('quality-progress-percentage');

// --- Elements for Colorize Tool ---
const colorizeFileInput = document.getElementById('colorize-file-input');
const colorizeUploadContent = document.getElementById('colorize-upload-content');
const colorizeProcessingContent = document.getElementById('colorize-processing-content');
const colorizeResultContent = document.getElementById('colorize-result-content');
const colorizeOriginalImg = document.getElementById('colorize-original-img');
const colorizeResultImg = document.getElementById('colorize-result-img');
const colorizeDownloadBtn = document.getElementById('colorize-download-btn');
const colorizeProgressBar = document.getElementById('colorize-progress-bar');
const colorizeProgressPercentage = document.getElementById('colorize-progress-percentage');

// --- Shared State ---
const REMOVEBG_API_KEY = "1xtwu8kX6fSk3kLgZPodskkL";
const NERO_API_KEY = "BZXK05KKV93CD1OMJ7709BD6";

// --- Background Removal Logic ---

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processImage(file);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processImage(file);
});

async function processImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => originalPreview.src = e.target.result;
    reader.readAsDataURL(file);

    uploadContent.classList.add('hidden');
    processingContent.classList.remove('hidden');
    const loadingText = processingContent.querySelector('p');

    progressBar.style.width = '0%';
    progressPercentage.innerText = '0%';
    loadingText.innerText = "جاري إرسال الصورة للمعالجة...";

    try {
        let progressInterval = updateGenericProgress(progressBar, progressPercentage, 10, 85);

        const formData = new FormData();
        formData.append("image_file", file);
        formData.append("size", "auto"); // Reverted to auto as requested

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: { "X-Api-Key": REMOVEBG_API_KEY },
            body: formData
        });

        if (!response.ok) {
            clearInterval(progressInterval);
            const error = await response.json();
            throw new Error(error.errors[0].title || "فشل في معالجة الصورة");
        }

        clearInterval(progressInterval);
        progressBar.style.width = '95%';
        progressPercentage.innerText = '95%';
        loadingText.innerText = "جاري استلام الصورة وبناء النتيجة...";

        const resultBlob = await response.blob();
        const resultUrl = URL.createObjectURL(resultBlob);

        progressBar.style.width = '100%';
        progressPercentage.innerText = '100%';
        resultImage.src = resultUrl;
        downloadBtn.href = resultUrl;

        setTimeout(() => {
            processingContent.classList.add('hidden');
            resultContent.classList.remove('hidden');
            if (suggestionCard) suggestionCard.classList.remove('hidden');
        }, 500);

    } catch (error) {
        console.error("API Error:", error);
        alert(`عذراً، حدث خطأ: ${error.message}`);
        resetTool();
    }
}

// --- Restoration Tool Logic (Separated) ---

if (qualityFileInput) {
    qualityFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processQuality(file);
    });
}

if (colorizeFileInput) {
    colorizeFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processColorize(file);
    });
}

async function processQuality(file) {
    await processNeroSingleTask(file, 'FaceRestoration', {
        upload: qualityUploadContent,
        processing: qualityProcessingContent,
        result: qualityResultContent,
        originalImg: qualityOriginalImg,
        resultImg: qualityResultImg,
        downloadBtn: qualityDownloadBtn,
        progressBar: qualityProgressBar,
        progressPercentage: qualityProgressPercentage
    });
}

async function processColorize(file) {
    await processNeroSingleTask(file, 'ColorizePhoto', {
        upload: colorizeUploadContent,
        processing: colorizeProcessingContent,
        result: colorizeResultContent,
        originalImg: colorizeOriginalImg,
        resultImg: colorizeResultImg,
        downloadBtn: colorizeDownloadBtn,
        progressBar: colorizeProgressBar,
        progressPercentage: colorizeProgressPercentage
    });
}

async function processNeroSingleTask(file, type, els) {
    const reader = new FileReader();
    reader.onload = (e) => {
        els.originalImg.src = e.target.result;
        els.resultImg.src = e.target.result;
    };
    reader.readAsDataURL(file);

    els.upload.classList.add('hidden');
    els.processing.classList.remove('hidden');

    els.progressBar.style.width = '0%';
    els.progressPercentage.innerText = '0%';

    try {
        const formData = new FormData();
        const payload = {
            type: type,
            body: {
                image: ""
                // Reverted: model and upscale removed to use Nero AI defaults
            }
        };
        formData.append('payload', JSON.stringify(payload));
        formData.append('file', file);

        let taskId = await createNeroTask(formData);
        let resultUrl = await pollNeroTask(taskId, (progress) => {
            els.progressBar.style.width = `${progress}%`;
            els.progressPercentage.innerText = `${progress}%`;
        });

        els.progressBar.style.width = '100%';
        els.progressPercentage.innerText = '100%';

        setTimeout(() => {
            els.resultImg.src = resultUrl;
            els.downloadBtn.href = resultUrl;
            els.processing.classList.add('hidden');
            els.result.classList.remove('hidden');
        }, 500);

    } catch (error) {
        console.error("Nero Task Error:", error);
        alert(`حدث خطأ: ${error.message}`);
        els.upload.classList.remove('hidden');
        els.processing.classList.add('hidden');
    }
}

async function createNeroTask(data, isJson = false) {
    const key = NERO_API_KEY.trim();
    const headers = new Headers();
    headers.append('x-neroai-api-key', key);
    headers.append('Accept', 'application/json');
    if (isJson) headers.append('Content-Type', 'application/json');

    try {
        const response = await fetch('https://api.nero.com/biz/api/task', {
            method: 'POST',
            headers: headers,
            body: data
        });

        const resData = await response.json();
        if (resData.code !== 0) {
            throw new Error(resData.message || `API Error ${resData.code}`);
        }
        return resData.data.task_id;
    } catch (err) {
        console.error("Create Task Failed:", err);
        throw err;
    }
}

async function pollNeroTask(taskId, onProgress) {
    let attempts = 0;
    const maxAttempts = 60;
    const key = NERO_API_KEY.trim();

    const poll = async () => {
        if (attempts >= maxAttempts) throw new Error("استغرقت العملية وقتاً طويلاً جداً");
        attempts++;

        try {
            const pollHeaders = new Headers();
            pollHeaders.append('x-neroai-api-key', key);
            pollHeaders.append('Accept', 'application/json');

            const response = await fetch(`https://api.nero.com/biz/api/task?task_id=${taskId}`, {
                headers: pollHeaders
            });

            const resData = await response.json();
            if (resData.code !== 0) throw new Error(resData.message || "فشل في جلب الحالة");

            const task = resData.data;
            if (task.status === 'done') return task.result.output;
            if (task.status === 'error') throw new Error(task.message || "حدث خطأ أثناء معالجة الصورة");

            if (onProgress) onProgress(Math.min(attempts * 5, 95));

            await new Promise(r => setTimeout(r, 2000));
            return poll();
        } catch (err) {
            console.error("Polling Failed:", err);
            throw err;
        }
    };
    return poll();
}

function updateGenericProgress(bar, label, start, end) {
    let current = start;
    bar.style.width = `${current}%`;
    label.innerText = `${current}%`;

    const interval = setInterval(() => {
        if (current < end) {
            current += Math.floor(Math.random() * 2) + 1;
        } else if (current < 98) {
            if (Math.random() > 0.7) current += 1;
        }
        if (current > 99) current = 99;
        bar.style.width = `${current}%`;
        label.innerText = `${current}%`;
    }, 300);
    return interval;
}

function resetTool() {
    fileInput.value = '';
    uploadContent.classList.remove('hidden');
    processingContent.classList.add('hidden');
    resultContent.classList.add('hidden');
    if (suggestionCard) suggestionCard.classList.add('hidden');
    originalPreview.src = '';
    resultImage.src = '';
    resultImage.style.backgroundColor = 'transparent';
    resultImage.style.backgroundImage = 'none';
}

function resetQualityTool() {
    qualityFileInput.value = '';
    qualityUploadContent.classList.remove('hidden');
    qualityProcessingContent.classList.add('hidden');
    qualityResultContent.classList.add('hidden');
}

function resetColorizeTool() {
    colorizeFileInput.value = '';
    colorizeUploadContent.classList.remove('hidden');
    colorizeProcessingContent.classList.add('hidden');
    colorizeResultContent.classList.add('hidden');
}

// --- Navigation & Menu Logic ---
const menuToggle = document.getElementById('menu-toggle');
const sideMenu = document.getElementById('side-menu');

function toggleMenu() {
    menuToggle.classList.toggle('active');
    sideMenu.classList.toggle('open');
    document.body.style.overflow = sideMenu.classList.contains('open') ? 'hidden' : 'auto';
}

if (menuToggle) {
    menuToggle.addEventListener('click', toggleMenu);
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Background Changer Logic
bgOptions.forEach(btn => {
    btn.addEventListener('click', () => {
        bgOptions.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const type = btn.dataset.type;
        const val = btn.dataset.value;

        if (type === 'color') {
            resultImage.style.backgroundColor = val;
            resultImage.style.backgroundImage = 'none';
        } else if (type === 'gradient') {
            resultImage.style.backgroundImage = val;
        } else if (type === 'image') {
            resultImage.style.backgroundImage = `url('${val}')`;
            resultImage.style.backgroundSize = 'cover';
            resultImage.style.backgroundPosition = 'center';
        }
    });
});

// Comparison Sliders Initialization
function initComparisonSliders() {
    const sliders = document.querySelectorAll('.comparison-slider');

    sliders.forEach(container => {
        const sliderInput = container.querySelector('.slider-input');
        const afterImage = container.querySelector('.image-after');
        const handle = container.querySelector('.slider-handle');

        if (sliderInput && afterImage && handle) {
            sliderInput.addEventListener('input', (e) => {
                const val = e.target.value;
                afterImage.style.clipPath = `inset(0 0 0 ${val}%)`;
                handle.style.left = `${val}%`;
            });
        }
    });
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    initComparisonSliders();
});
