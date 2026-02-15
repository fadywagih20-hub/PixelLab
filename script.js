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


// Handle File Selection
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
});

// Drag and Drop Logic
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
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
});

// --- إعدادات الـ API ---
const API_KEY = "1xtwu8kX6fSk3kLgZPodskkL";

async function processImage(file) {
    // 1. عرض معاينة الصورة الأصلية
    const reader = new FileReader();
    reader.onload = (e) => {
        originalPreview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // 2. الانتقال لشاشة التحميل
    uploadContent.classList.add('hidden');
    processingContent.classList.remove('hidden');
    const loadingText = processingContent.querySelector('p');

    // إعادة تعيين شريط التحميل
    progressBar.style.width = '0%';
    progressPercentage.innerText = '0%';
    loadingText.innerText = "جاري إرسال الصورة للمعالجة...";

    try {
        // محاكاة تحميل
        let progressInterval = updateProgress(10, 85);

        const formData = new FormData();
        formData.append("image_file", file);
        formData.append("size", "auto");

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: {
                "X-Api-Key": API_KEY
            },
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

        // اكتمال التحميل
        progressBar.style.width = '100%';
        progressPercentage.innerText = '100%';

        // عرض النتيجة
        resultImage.src = resultUrl;

        // التحميل الأولي (شفاف)
        downloadBtn.href = resultUrl;

        setTimeout(() => {
            processingContent.classList.add('hidden');
            resultContent.classList.remove('hidden');
        }, 500);

    } catch (error) {
        console.error("API Error:", error);
        alert(`عذراً، حدث خطأ: ${error.message}`);
        resetTool();
    }
}

function updateProgress(start, end) {
    let current = start;
    progressBar.style.width = `${current}%`;
    progressPercentage.innerText = `${current}%`;

    const interval = setInterval(() => {
        // إذا وصل للرقم المستهدف (85%) يكمل ببطء شديد جداً ليعطي انطباع بالعمل
        if (current < end) {
            current += Math.floor(Math.random() * 2) + 1;
        } else if (current < 98) {
            // حركة بطيئة جداً بعد الـ 85% لضمان عدم توقف الشريط تماماً
            if (Math.random() > 0.7) current += 1;
        }

        if (current > 99) current = 99;

        progressBar.style.width = `${current}%`;
        progressPercentage.innerText = `${current}%`;

        // تغيير النص إذا تأخرت العملية
        const loadingText = document.querySelector('#processing-content p');
        if (current > 80 && loadingText) {
            loadingText.innerText = "الذكاء الاصطناعي يستغرق وقتاً أطول قليلاً، جاري إتمام المهمة...";
        }
    }, 400);
    return interval;
}

// Tab Switching
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// Background Selection Logic
bgOptions.forEach(btn => {
    btn.addEventListener('click', () => {
        bgOptions.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const type = btn.getAttribute('data-type');
        const value = btn.getAttribute('data-value');

        resultContainer.style.backgroundColor = 'transparent';
        resultContainer.style.backgroundImage = '';

        if (type === 'color') {
            if (value !== 'transparent') {
                resultContainer.style.backgroundColor = value;
                resultContainer.style.backgroundImage = 'none';
            }
        } else if (type === 'gradient') {
            resultContainer.style.backgroundImage = value;
        } else if (type === 'image') {
            resultContainer.style.backgroundImage = `url('${value}')`;
            resultContainer.style.backgroundSize = 'cover';
            resultContainer.style.backgroundPosition = 'center';
        }

        updateDownloadLink();
    });
});

async function updateDownloadLink() {
    const activeBtn = document.querySelector('.color-btn.active, .img-btn.active');
    if (!activeBtn) return;

    const type = activeBtn.getAttribute('data-type');
    const value = activeBtn.getAttribute('data-value');

    if (type === 'color' && value === 'transparent') {
        downloadBtn.href = resultImage.src;
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fgImg = new Image();

    fgImg.crossOrigin = "anonymous";
    fgImg.onload = async () => {
        canvas.width = fgImg.width;
        canvas.height = fgImg.height;

        if (type === 'color') {
            ctx.fillStyle = value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (type === 'gradient') {
            // Simple gradient for canvas
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            if (value.includes('#')) {
                const colors = value.match(/#[a-fA-F0-9]{3,6}/g);
                if (colors && colors.length >= 2) {
                    grad.addColorStop(0, colors[0]);
                    grad.addColorStop(1, colors[1]);
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = '#4facfe';
                }
            } else {
                ctx.fillStyle = '#4facfe';
            }
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (type === 'image') {
            const bgImg = new Image();
            bgImg.crossOrigin = "anonymous";
            bgImg.src = value;
            await new Promise(resolve => {
                bgImg.onload = resolve;
                bgImg.onerror = resolve; // Continue even if bg fails
            });

            if (bgImg.complete && bgImg.naturalWidth > 0) {
                const ratio = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
                const w = bgImg.width * ratio;
                const h = bgImg.height * ratio;
                ctx.drawImage(bgImg, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
            }
        }

        ctx.drawImage(fgImg, 0, 0);
        downloadBtn.href = canvas.toDataURL("image/png");
    };
    fgImg.src = resultImage.src;
}

function resetTool() {
    fileInput.value = '';
    uploadContent.classList.remove('hidden');
    processingContent.classList.add('hidden');
    resultContent.classList.add('hidden');
    resultImage.src = '';
    originalPreview.src = '';

    bgOptions.forEach(b => b.classList.remove('active'));
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const transBtn = document.querySelector('.color-btn.transparent');
    if (transBtn) transBtn.classList.add('active');

    tabButtons[0].classList.add('active');
    tabContents[0].classList.add('active');

    resultContainer.style.backgroundColor = 'transparent';
    resultContainer.style.backgroundImage = '';
}

// --- Comparison Slider Logic ---
const beforeAfterSlider = document.getElementById('before-after-slider');
const imageAfter = document.querySelector('.image-after');
const sliderHandle = document.querySelector('.slider-handle');

if (beforeAfterSlider) {
    beforeAfterSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        // Update clip-path for image-after
        imageAfter.style.clipPath = `inset(0 0 0 ${value}%)`;
        // Update handle position
        sliderHandle.style.left = `${value}%`;
    });
}
