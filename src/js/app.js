// ===================================================
// PORTFÓLIO — SAVE FILE
// Livro 100% estático: sem backend, sem API.
// Todo o conteúdo já está embutido direto no HTML.
// ===================================================

document.addEventListener("DOMContentLoaded", () => {
    const bookElement = document.getElementById("book");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const soundToggle = document.getElementById("sound-toggle");
    const iconOn = soundToggle.querySelector(".sound-icon-on");
    const iconOff = soundToggle.querySelector(".sound-icon-off");

    let isMuted = false;
    let pageFlip = null;

    try {
        pageFlip = new St.PageFlip(bookElement, {
            width: 550,
            height: 800,
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            drawShadow: true,
            maxShadowOpacity: 0.4,
            showCover: true,
            mobileScrollSupport: true,
            useMouseEvents: false,
            showPageCorners: false,
            disableFlipByClick: true,
            flippingTime: 800
        });

        pageFlip.loadFromHTML(document.querySelectorAll(".page"));

        // Estado de arraste personalizado (permite virar página arrastando)
        let activeDragPage = null;
        let isClicking = false;
        let startX = 0;
        let startY = 0;
        let dragStarted = false;

        document.querySelectorAll(".page").forEach((page, index) => {
            page.addEventListener("mousedown", (e) => {
                if (e.target.closest("a") || e.target.closest("button")) return;
                isClicking = true;
                startX = e.clientX;
                startY = e.clientY;
                dragStarted = false;
                activeDragPage = { page, index };
            });

            page.addEventListener("touchstart", (e) => {
                if (e.target.closest("a") || e.target.closest("button")) return;
                const touch = e.touches[0];
                isClicking = true;
                startX = touch.clientX;
                startY = touch.clientY;
                dragStarted = false;
                activeDragPage = { page, index };
            });
        });

        const handleMove = (clientX, clientY, isTouch = false) => {
            if (!isClicking || !activeDragPage) return;

            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            const bookRect = bookElement.getBoundingClientRect();

            if (distance > 10 && !dragStarted) {
                dragStarted = true;
                let cornerX, cornerY;

                const centerY = bookRect.top + bookRect.height / 2;
                cornerY = startY < centerY ? 0 : bookRect.height;
                cornerX = activeDragPage.index % 2 === 0 ? bookRect.width : 0;

                document.body.classList.add("dragging");
                pageFlip.startUserTouch({ x: cornerX, y: cornerY });
            }

            if (dragStarted) {
                const relX = clientX - bookRect.left;
                const relY = clientY - bookRect.top;
                pageFlip.userMove({ x: relX, y: relY }, isTouch);
            }
        };

        const handleRelease = (clientX, clientY, isTouch = false) => {
            if (dragStarted) {
                const bookRect = bookElement.getBoundingClientRect();
                const relX = clientX - bookRect.left;
                const relY = clientY - bookRect.top;
                pageFlip.userStop({ x: relX, y: relY }, isTouch);
            }
            isClicking = false;
            dragStarted = false;
            activeDragPage = null;
            document.body.classList.remove("dragging");
        };

        window.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY, false));
        window.addEventListener("touchmove", (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY, true);
            }
        });
        window.addEventListener("mouseup", (e) => handleRelease(e.clientX, e.clientY, false));
        window.addEventListener("touchend", (e) => {
            const touch = e.changedTouches[0] || e.touches[0];
            if (touch) {
                handleRelease(touch.clientX, touch.clientY, true);
            } else {
                handleRelease(startX, startY, true);
            }
        });

        bookElement.style.display = "block";

    } catch (error) {
        console.error("Erro ao inicializar a biblioteca PageFlip:", error);
    }

    // Efeito sonoro de virar página (Web Audio API)
    function playPaperTurnSound() {
        if (isMuted) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioCtx = new AudioContext();
            const duration = 0.45;
            const sampleRate = audioCtx.sampleRate;
            const bufferSize = sampleRate * duration;
            const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                const progress = i / bufferSize;
                const noise = Math.random() * 2 - 1;

                let envelope = 0;
                if (progress < 0.3) {
                    envelope = progress / 0.3;
                } else {
                    envelope = (1 - progress) / 0.7;
                }

                const paperCrackle = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 0.35 : 0;
                data[i] = (noise * 0.65 + paperCrackle) * envelope * 0.12;
            }

            const noiseNode = audioCtx.createBufferSource();
            noiseNode.buffer = buffer;

            const bandpassFilter = audioCtx.createBiquadFilter();
            bandpassFilter.type = "bandpass";
            bandpassFilter.Q.value = 2.0;
            bandpassFilter.frequency.setValueAtTime(1500, audioCtx.currentTime);
            bandpassFilter.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + duration);

            const lowpassFilter = audioCtx.createBiquadFilter();
            lowpassFilter.type = "lowpass";
            lowpassFilter.frequency.setValueAtTime(3800, audioCtx.currentTime);

            noiseNode.connect(bandpassFilter);
            bandpassFilter.connect(lowpassFilter);
            lowpassFilter.connect(audioCtx.destination);

            noiseNode.start();
        } catch (e) {
            console.warn("Falha ao tocar som de virada de página:", e);
        }
    }

    soundToggle.addEventListener("click", () => {
        isMuted = !isMuted;
        iconOn.classList.toggle("hidden", isMuted);
        iconOff.classList.toggle("hidden", !isMuted);
    });

    if (pageFlip) {
        pageFlip.on("changeState", (e) => {
            if (e.data === "flipping") {
                playPaperTurnSound();
            }
        });

        pageFlip.on("flip", (e) => {
            const currentPage = e.data;
            const totalPages = pageFlip.getPageCount();

            btnPrev.classList.toggle("hidden", currentPage === 0);
            btnNext.classList.toggle("hidden", currentPage === totalPages - 1);
        });

        btnPrev.addEventListener("click", () => pageFlip.flipPrev());
        btnNext.addEventListener("click", () => pageFlip.flipNext());

        document.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") pageFlip.flipPrev();
            else if (e.key === "ArrowRight") pageFlip.flipNext();
        });

        btnPrev.classList.add("hidden");
    }
});

// ===================================================
// COVER: typing effect for the role tagline
// Isolated from the flip-book logic above.
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
    const typingText = document.getElementById("typing-text");
    if (!typingText) return;

    const roles = ["Web Developer", "Front-End Developer", "Back-End Developer", "AI Automation"];
    let roleIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function typeEffect() {
        const current = roles[roleIndex];

        if (!deleting) {
            typingText.textContent = current.substring(0, charIndex);
            charIndex++;

            if (charIndex > current.length) {
                deleting = true;
                setTimeout(typeEffect, 1800);
                return;
            }
        } else {
            typingText.textContent = current.substring(0, charIndex);
            charIndex--;

            if (charIndex < 0) {
                deleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                charIndex = 0;
            }
        }

        setTimeout(typeEffect, deleting ? 40 : 90);
    }

    typeEffect();
});
