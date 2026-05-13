/* ============================================
   BÉ CHÂU SA — Interactions & Audio
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const isMobile = window.innerWidth <= 768;

  // --- Preloader ---
  const preloader = document.querySelector('.preloader');
  window.addEventListener('load', () => {
    setTimeout(() => {
      preloader.classList.add('hidden');
      initHeroAnimation();
    }, 1500);
  });
  setTimeout(() => preloader?.classList.add('hidden'), 4000);

  // --- Hero Staggered Animation ---
  function initHeroAnimation() {
    const heroEls = document.querySelectorAll('.hero [data-hero-animate]');
    heroEls.forEach((el, i) => {
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 300 + i * 400);
    });
  }

  // --- Scroll Progress Bar ---
  const progressBar = document.querySelector('.progress-bar');
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }

  // --- Scroll Fade-In Observer ---
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

  document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .stagger, .pull-quote, .letter-box').forEach(el => {
    fadeObserver.observe(el);
  });

  // --- Chapter Navigation Dots ---
  const sections = document.querySelectorAll('[data-chapter]');
  const dots = document.querySelectorAll('.chapter-dot');

  const chapterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const chapter = entry.target.dataset.chapter;
        dots.forEach(d => d.classList.remove('active'));
        const activeDot = document.querySelector(`.chapter-dot[data-target="${chapter}"]`);
        if (activeDot) activeDot.classList.add('active');
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => chapterObserver.observe(s));

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const target = document.querySelector(`[data-chapter="${dot.dataset.target}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // --- Floating Particles ---
  const canvas = document.getElementById('particles');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = isMobile ? 15 : 40;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedY = -(Math.random() * 0.3 + 0.1);
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.pulse = Math.random() * Math.PI * 2;
        this.pulseSpeed = Math.random() * 0.02 + 0.005;
        this.hue = Math.random() > 0.5 ? 43 : 330;
      }
      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.pulse += this.pulseSpeed;
        this.currentOpacity = this.opacity * (0.5 + 0.5 * Math.sin(this.pulse));
        if (this.y < -10) { this.reset(); this.y = canvas.height + 10; }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 70%, 70%, ${this.currentOpacity})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 70%, 70%, ${this.currentOpacity * 0.15})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }

  // ===========================================
  // AMBIENT AUDIO — Web Audio API Piano
  // ===========================================
  const audioBtn = document.querySelector('.audio-control');
  let audioCtx = null;
  let isPlaying = false;
  let masterGain = null;
  let ambientInterval = null;

  // Soft piano-like notes (pentatonic scale for peaceful sound)
  const NOTES = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];

  function createAudioContext() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioCtx.destination);

    // Reverb via convolver (simple delay-based)
    return audioCtx;
  }

  function playNote(freq, startTime, duration) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // Soft sine wave
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Low-pass filter for warmth
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    // ADSR envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.08, startTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.03, startTime + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  function playAmbientChord() {
    if (!audioCtx || !isPlaying) return;

    const now = audioCtx.currentTime;
    // Pick 2-3 random notes
    const count = Math.random() > 0.5 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const note = NOTES[Math.floor(Math.random() * NOTES.length)];
      const delay = Math.random() * 1.5;
      const duration = 3 + Math.random() * 4;
      playNote(note, now + delay, duration);
    }
  }

  function startAmbient() {
    if (!audioCtx) createAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    isPlaying = true;
    // Fade in
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 1);

    // Play initial chord
    playAmbientChord();

    // Schedule recurring chords
    ambientInterval = setInterval(() => {
      if (isPlaying) playAmbientChord();
    }, 3000 + Math.random() * 2000);

    audioBtn.classList.add('playing');
  }

  function stopAmbient() {
    isPlaying = false;
    if (masterGain && audioCtx) {
      masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    }
    if (ambientInterval) clearInterval(ambientInterval);
    audioBtn.classList.remove('playing');
  }

  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      if (isPlaying) {
        stopAmbient();
      } else {
        startAmbient();
      }
    });
  }

  // --- Audio Prompt (first time) ---
  let audioPrompted = false;
  const promptObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !audioPrompted && !isPlaying) {
        audioPrompted = true;
        // Pulse the audio button to attract attention
        audioBtn.style.animation = 'audioPulse 1.5s ease-in-out 3';
        setTimeout(() => { audioBtn.style.animation = ''; }, 4500);
      }
    });
  }, { threshold: 0.5 });

  const ch1 = document.getElementById('ch1');
  if (ch1) promptObserver.observe(ch1);

  // --- Parallax subtle effect on scroll ---
  const heroImage = document.querySelector('.hero-image-container');
  function updateParallax() {
    if (!heroImage) return;
    const scrollY = window.scrollY;
    const speed = 0.3;
    if (scrollY < window.innerHeight) {
      heroImage.style.transform = `translateY(${scrollY * speed}px)`;
    }
  }

  // --- Scroll Event Throttle ---
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateProgress();
        if (!isMobile) updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  });

  // --- Back to Top ---
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.style.opacity = window.scrollY > 800 ? '1' : '0';
      backToTop.style.pointerEvents = window.scrollY > 800 ? 'auto' : 'none';
    });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Typing effect for the final quote ---
  const finalQuote = document.querySelector('.epilogue .final-line');
  if (finalQuote) {
    const finalObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          finalQuote.style.animation = 'fadeGlow 2s ease-in-out forwards';
          finalObserver.disconnect();
        }
      });
    }, { threshold: 0.5 });
    finalObserver.observe(finalQuote);
  }
});
