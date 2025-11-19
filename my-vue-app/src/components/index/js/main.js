import {trainingLibrary} from './data/trainingLibrary.js';
import {languageTexts} from './data/languageTexts.js';

export function initTrainingModule() {
    const genreSelector = document.getElementById('genre-selector');
    const trackSelect = document.getElementById('training-track-select');
    const startBtn = document.getElementById('start-singing');
    const stopBtn = document.getElementById('stop-singing');
    const playbackBtn = document.getElementById('playback-comparison');

    if (!genreSelector || !trackSelect || !startBtn || !stopBtn || !playbackBtn) {
        return;
    }

    genreSelector.querySelectorAll('.genre-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setTrainingGenre(btn.getAttribute('data-genre'));
        });
    });

    trackSelect.addEventListener('change', event => {
        applyTrainingTrackSelection(event.target.value);
    });

    const referenceAudio = document.getElementById('reference-audio');
    if (referenceAudio) {
        referenceAudio.addEventListener('play', () => {
            highlightLyrics(0);
        });
        referenceAudio.addEventListener('timeupdate', () => {
            highlightLyrics(referenceAudio.currentTime);
        });
    }

    startBtn.addEventListener('click', startTrainingSession);
    stopBtn.addEventListener('click', () => stopTrainingSession(true));
    playbackBtn.addEventListener('click', playComparison);

    setTrainingGenre('baiju', false);
}

export function setTrainingGenre(genre, keepTrack = false) {
    if (!trainingLibrary[genre]) {
        console.warn('未知曲种:', genre);
        return;
    }

    trainingState.currentGenre = genre;

    const genreButtons = document.querySelectorAll('#genre-selector .genre-btn');
    genreButtons.forEach(btn => {
        if (btn.getAttribute('data-genre') === genre) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const trackSelect = document.getElementById('training-track-select');
    if (!trackSelect) return;

    const tracks = trainingLibrary[genre].tracks;
    trackSelect.innerHTML = tracks.map(track => `<option value="${track.id}">${track.title}</option>`).join('');

    document.getElementById('reference-hint').textContent = trainingLibrary[genre].referenceHint || '';

    if (!keepTrack || !trainingState.currentTrack || !tracks.some(track => track.id === trainingState.currentTrack.id)) {
        const firstTrack = tracks[0];
        if (firstTrack) {
            applyTrainingTrackSelection(firstTrack.id);
        }
    }
}

export function findTrackById(trackId) {
    const genre = trainingLibrary[trainingState.currentGenre];
    if (!genre) return null;
    return genre.tracks.find(track => track.id === trackId) || null;
}

export function applyTrainingTrackSelection(trackId) {
    const track = findTrackById(trackId);
    const trackSelect = document.getElementById('training-track-select');

    if (!track) {
        console.warn('未找到唱段:', trackId);
        return;
    }

    if (trackSelect && trackSelect.value !== track.id) {
        trackSelect.value = track.id;
    }

    if (trainingState.isTraining) {
        stopTrainingSession(false);
    }

    trainingState.currentTrack = track;
    trainingState.expectedBeatInterval = track.tempo ? 60 / track.tempo : 0;
    trainingState.lastLyricIndex = -1;
    trainingState.metrics = {pitchError: [], beatDiff: [], clarity: []};

    renderLyrics(track);
    resetScoreboard();
    configureReferenceAudio(track);
}

export function renderLyrics(track) {
    const container = document.getElementById('lyrics-display');
    if (!container) return;

    container.innerHTML = track.lyrics.map(line => {
        return `<div class="lyric-line" data-start="${line.start}" data-end="${line.end}">${line.text}</div>`;
    }).join('');
}

export function resetScoreboard() {
    const pitchScore = document.getElementById('pitch-score');
    const rhythmScore = document.getElementById('rhythm-score');
    const pronunciationScore = document.getElementById('pronunciation-score');
    const livePitch = document.getElementById('live-pitch');
    const liveTempo = document.getElementById('live-tempo');
    const liveFormant = document.getElementById('live-formant');
    const trainingTimer = document.getElementById('training-timer');

    if (pitchScore) pitchScore.textContent = '-';
    if (rhythmScore) rhythmScore.textContent = '-';
    if (pronunciationScore) pronunciationScore.textContent = '-';
    if (livePitch) livePitch.textContent = '当前音高：-- Hz';
    if (liveTempo) liveTempo.textContent = '当前节奏：-- BPM';
    if (liveFormant) liveFormant.textContent = '发音清晰度：--';
    if (trainingTimer) trainingTimer.textContent = '训练时长：00:00';

    const canvas = document.getElementById('pitch-visualizer');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#080b18';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const userRecording = document.getElementById('user-recording');
    const playbackBtn = document.getElementById('playback-comparison');
    if (playbackBtn) {
        playbackBtn.disabled = !(userRecording && userRecording.src);
    }
}

export function configureReferenceAudio(track) {
    const referenceAudio = document.getElementById('reference-audio');
    if (!referenceAudio) return;

    if (track.audio) {
        referenceAudio.src = track.audio;
    } else {
        referenceAudio.removeAttribute('src');
    }

    referenceAudio.pause();
    referenceAudio.currentTime = 0;
}

export async function startTrainingSession() {
    if (trainingState.isTraining) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('当前浏览器不支持麦克风访问，请更换现代浏览器。');
        return;
    }

    const track = trainingState.currentTrack;
    if (!track) {
        alert('请先选择唱段。');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            alert('当前浏览器不支持音频分析。');
            return;
        }

        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.6;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const mediaRecorder = typeof MediaRecorder !== 'undefined' ? new MediaRecorder(stream) : null;
        if (!mediaRecorder) {
            alert('当前浏览器不支持录音功能。');
            return;
        }

        trainingState.audioContext = audioContext;
        trainingState.analyser = analyser;
        trainingState.mediaStream = stream;
        trainingState.mediaRecorder = mediaRecorder;
        trainingState.recordingChunks = [];
        trainingState.pitchHistory = [];
        trainingState.beatTimes = [];
        trainingState.lastBeatAt = 0;
        trainingState.metrics = {pitchError: [], beatDiff: [], clarity: []};
        trainingState.startTimestamp = performance.now();
        trainingState.elapsedSeconds = 0;
        trainingState.isTraining = true;
        trainingState.lastLyricIndex = -1;

        mediaRecorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) {
                trainingState.recordingChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = handleRecordingStop;
        mediaRecorder.start();

        const referenceAudio = document.getElementById('reference-audio');
        if (referenceAudio && referenceAudio.src) {
            referenceAudio.currentTime = 0;
            referenceAudio.play().catch(() => {
            });
        }

        document.getElementById('start-singing').disabled = true;
        document.getElementById('stop-singing').disabled = false;
        document.getElementById('playback-comparison').disabled = true;

        analyseFrame();
    } catch (error) {
        console.error(error);
        alert('无法访问麦克风，请检查浏览器权限设置。');
    }
}

export function stopTrainingSession(manualStop) {
    if (!trainingState.isTraining) {
        return;
    }

    trainingState.isTraining = false;
    trainingState.elapsedSeconds = (performance.now() - trainingState.startTimestamp) / 1000;

    if (trainingState.animationId) {
        cancelAnimationFrame(trainingState.animationId);
    }

    if (trainingState.mediaRecorder && trainingState.mediaRecorder.state !== 'inactive') {
        trainingState.mediaRecorder.stop();
    }

    if (trainingState.mediaStream) {
        trainingState.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (trainingState.audioContext) {
        trainingState.audioContext.close().catch(() => {
        });
    }

    const referenceAudio = document.getElementById('reference-audio');
    if (referenceAudio) {
        referenceAudio.pause();
        referenceAudio.currentTime = 0;
    }

    document.getElementById('start-singing').disabled = false;
    document.getElementById('stop-singing').disabled = true;

    updateTimerDisplay(trainingState.elapsedSeconds);

    if (manualStop) {
        updateScoreboardFinal();
    }
}

export function handleRecordingStop() {
    if (!trainingState.recordingChunks.length) {
        console.warn('未捕获到有效录音数据');
        return;
    }

    const mimeType = trainingState.mediaRecorder && trainingState.mediaRecorder.mimeType ? trainingState.mediaRecorder.mimeType : 'audio/webm';
    const blob = new Blob(trainingState.recordingChunks, {type: mimeType});
    const audioURL = URL.createObjectURL(blob);
    const userRecording = document.getElementById('user-recording');

    userRecording.src = audioURL;
    userRecording.load();

    document.getElementById('playback-comparison').disabled = false;
}

export function analyseFrame() {
    if (!trainingState.isTraining || !trainingState.analyser || !trainingState.audioContext) {
        return;
    }

    const analyser = trainingState.analyser;
    const bufferLength = analyser.fftSize;
    const timeDomainData = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(timeDomainData);

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    const pitch = detectPitch(timeDomainData, trainingState.audioContext.sampleRate);
    updatePitchMetrics(pitch);

    updateTempoMetrics(timeDomainData, trainingState.audioContext.sampleRate);
    updatePronunciationMetrics(frequencyData);
    updateLyricHighlight();
    updateTimerDisplay((performance.now() - trainingState.startTimestamp) / 1000);
    updateScoreboardRealtime();
    drawPitchVisualizer();

    trainingState.animationId = requestAnimationFrame(analyseFrame);
}

export function detectPitch(buffer, sampleRate) {
    const SIZE = buffer.length;
    let sum = 0;
    for (let i = 0; i < SIZE; i++) {
        sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / SIZE);
    if (rms < 0.01) {
        return null;
    }

    let bestOffset = -1;
    let bestCorrelation = 0;
    let foundGoodCorrelation = false;
    const correlations = new Array(SIZE).fill(0);

    for (let offset = 8; offset < SIZE / 2; offset++) {
        let correlation = 0;
        for (let i = 0; i < SIZE - offset; i++) {
            correlation += buffer[i] * buffer[i + offset];
        }
        correlation = correlation / (SIZE - offset);
        correlations[offset] = correlation;

        if (correlation > 0.9 && correlation > bestCorrelation) {
            foundGoodCorrelation = true;
            bestCorrelation = correlation;
            bestOffset = offset;
        } else if (foundGoodCorrelation && correlation < bestCorrelation) {
            const shift = (correlations[bestOffset + 1] - correlations[bestOffset - 1]) / correlations[bestOffset];
            return sampleRate / (bestOffset + (shift * 0.5));
        }
    }

    if (bestOffset > -1) {
        return sampleRate / bestOffset;
    }

    return null;
}

export function getExpectedPitch(seconds) {
    const track = trainingState.currentTrack;
    if (!track || !track.pitchContour || !track.pitchContour.length) {
        return null;
    }

    const contour = track.pitchContour;
    for (let i = 0; i < contour.length - 1; i++) {
        const current = contour[i];
        const next = contour[i + 1];
        if (seconds >= current.time && seconds <= next.time) {
            const ratio = (seconds - current.time) / (next.time - current.time);
            return current.freq + ratio * (next.freq - current.freq);
        }
    }
    return contour[contour.length - 1].freq;
}

export function updatePitchMetrics(pitch) {
    const now = performance.now();
    const elapsed = (now - trainingState.startTimestamp) / 1000;
    const expected = getExpectedPitch(elapsed);

    const livePitch = document.getElementById('live-pitch');
    if (livePitch) {
        livePitch.textContent = pitch ? `当前音高：${pitch.toFixed(1)} Hz` : '当前音高：-- Hz';
    }

    trainingState.pitchHistory.push({time: elapsed, actual: pitch, expected});
    if (trainingState.pitchHistory.length > 600) {
        trainingState.pitchHistory.shift();
    }

    if (pitch && expected) {
        const deviation = Math.abs(pitch - expected) / expected;
        trainingState.metrics.pitchError.push(deviation);
        if (trainingState.metrics.pitchError.length > 200) {
            trainingState.metrics.pitchError.shift();
        }
    }
}

export function updateTempoMetrics(buffer, sampleRate) {
    let peak = 0;
    for (let i = 0; i < buffer.length; i++) {
        peak = Math.max(peak, Math.abs(buffer[i]));
    }

    const now = performance.now();
    if (peak > 0.2 && (!trainingState.lastBeatAt || now - trainingState.lastBeatAt > 250)) {
        trainingState.beatTimes.push(now);
        trainingState.lastBeatAt = now;
        if (trainingState.beatTimes.length > 12) {
            trainingState.beatTimes.shift();
        }
    }

    if (trainingState.beatTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < trainingState.beatTimes.length; i++) {
            intervals.push((trainingState.beatTimes[i] - trainingState.beatTimes[i - 1]) / 1000);
        }
        const avgInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
        const tempo = 60 / avgInterval;

        const liveTempo = document.getElementById('live-tempo');
        if (liveTempo && isFinite(tempo)) {
            liveTempo.textContent = `当前节奏：${tempo.toFixed(1)} BPM`;
        }

        if (trainingState.expectedBeatInterval) {
            const diff = Math.abs(avgInterval - trainingState.expectedBeatInterval) / trainingState.expectedBeatInterval;
            trainingState.metrics.beatDiff.push(diff);
            if (trainingState.metrics.beatDiff.length > 200) {
                trainingState.metrics.beatDiff.shift();
            }
        }
    }
}

export function updatePronunciationMetrics(frequencyData) {
    let low = 0;
    let mid = 0;
    let high = 0;
    const len = frequencyData.length;

    for (let i = 0; i < len; i++) {
        if (i < len * 0.2) {
            low += frequencyData[i];
        } else if (i < len * 0.65) {
            mid += frequencyData[i];
        } else {
            high += frequencyData[i];
        }
    }

    const total = low + mid + high || 1;
    const clarity = mid / total;
    trainingState.metrics.clarity.push(clarity);
    if (trainingState.metrics.clarity.length > 200) {
        trainingState.metrics.clarity.shift();
    }

    const liveFormant = document.getElementById('live-formant');
    if (liveFormant) {
        liveFormant.textContent = `发音清晰度：${Math.round(clarity * 100)}%`;
    }
}

export function updateLyricHighlight() {
    const track = trainingState.currentTrack;
    if (!track) return;

    const elapsed = trainingState.isTraining ? (performance.now() - trainingState.startTimestamp) / 1000 : trainingState.elapsedSeconds;
    const index = track.lyrics.findIndex(line => elapsed >= line.start && elapsed < line.end);

    if (index !== trainingState.lastLyricIndex) {
        const lines = document.querySelectorAll('#lyrics-display .lyric-line');
        lines.forEach((line, idx) => {
            if (idx === index) {
                line.classList.add('active');
            } else {
                line.classList.remove('active');
            }
        });
        trainingState.lastLyricIndex = index;
    }
}

export function highlightLyrics(offsetSeconds) {
    const track = trainingState.currentTrack;
    if (!track) return;

    const index = track.lyrics.findIndex(line => offsetSeconds >= line.start && offsetSeconds < line.end);
    const lines = document.querySelectorAll('#lyrics-display .lyric-line');
    lines.forEach((line, idx) => {
        if (idx === index) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });
}

export function updateTimerDisplay(seconds) {
    trainingState.elapsedSeconds = seconds;
    const timer = document.getElementById('training-timer');
    if (!timer) return;

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    timer.textContent = `训练时长：${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function updateScoreboardRealtime() {
    const pitchErrors = trainingState.metrics.pitchError;
    const beatDiffs = trainingState.metrics.beatDiff;
    const clarities = trainingState.metrics.clarity;

    const pitchScoreEl = document.getElementById('pitch-score');
    const rhythmScoreEl = document.getElementById('rhythm-score');
    const pronunciationScoreEl = document.getElementById('pronunciation-score');

    if (pitchErrors.length && pitchScoreEl) {
        const avgError = pitchErrors.reduce((sum, value) => sum + value, 0) / pitchErrors.length;
        const score = Math.max(0, Math.min(100, 100 - avgError * 450));
        pitchScoreEl.textContent = Math.round(score);
    }

    if (beatDiffs.length && rhythmScoreEl) {
        const avgDiff = beatDiffs.reduce((sum, value) => sum + value, 0) / beatDiffs.length;
        const score = Math.max(0, Math.min(100, 100 - avgDiff * 400));
        rhythmScoreEl.textContent = Math.round(score);
    }

    if (clarities.length && pronunciationScoreEl) {
        const avgClarity = clarities.reduce((sum, value) => sum + value, 0) / clarities.length;
        const score = Math.max(0, Math.min(100, 60 + avgClarity * 50));
        pronunciationScoreEl.textContent = Math.round(score);
    }
}

export function updateScoreboardFinal() {
    const pitchScoreEl = document.getElementById('pitch-score');
    const rhythmScoreEl = document.getElementById('rhythm-score');
    const pronunciationScoreEl = document.getElementById('pronunciation-score');

    if (pitchScoreEl && pitchScoreEl.textContent === '-') {
        pitchScoreEl.textContent = '60';
    }
    if (rhythmScoreEl && rhythmScoreEl.textContent === '-') {
        rhythmScoreEl.textContent = '60';
    }
    if (pronunciationScoreEl && pronunciationScoreEl.textContent === '-') {
        pronunciationScoreEl.textContent = '60';
    }
}

export function drawPitchVisualizer() {
    const canvas = document.getElementById('pitch-visualizer');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#080b18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const history = trainingState.pitchHistory;
    if (!history.length) return;

    const maxTime = history[history.length - 1].time;
    const minTime = Math.max(0, maxTime - 15);
    const filtered = history.filter(item => item.time >= minTime);
    if (!filtered.length) return;

    const minFreq = 150;
    const maxFreq = 400;

    ctx.strokeStyle = 'rgba(255, 193, 7, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    filtered.forEach((point, index) => {
        if (!point.expected) return;
        const x = ((point.time - minTime) / (maxTime - minTime || 1)) * canvas.width;
        const y = canvas.height - ((point.expected - minFreq) / (maxFreq - minFreq)) * canvas.height;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    ctx.strokeStyle = 'rgba(76, 175, 80, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    filtered.forEach(point => {
        if (!point.actual) {
            started = false;
            return;
        }
        const x = ((point.time - minTime) / (maxTime - minTime || 1)) * canvas.width;
        const y = canvas.height - ((point.actual - minFreq) / (maxFreq - minFreq)) * canvas.height;
        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
}

export function playComparison() {
    const referenceAudio = document.getElementById('reference-audio');
    const userRecording = document.getElementById('user-recording');

    if (!userRecording || !userRecording.src) {
        alert('请先完成一次录音后再进行对比回放。');
        return;
    }

    const playbackBtn = document.getElementById('playback-comparison');
    playbackBtn.disabled = true;

    if (referenceAudio && referenceAudio.src) {
        referenceAudio.currentTime = 0;
        referenceAudio.play().catch(() => {
        }).finally(() => {
        });
        referenceAudio.addEventListener('ended', function handleReferenceEnd() {
                referenceAudio.removeEventListener('ended', handleReferenceEnd);
                userRecording.currentTime = 0;
                userRecording.play().catch(() => {
                }).finally(() => {
                    playbackBtn.disabled = false;
                });
            }
        )
        ;
    } else {
        userRecording.currentTime = 0;
        userRecording.play().catch(() => {
        }).finally(() => {
            playbackBtn.disabled = false;
        });
    }

    userRecording.addEventListener('ended', function handleUserEnd() {
        userRecording.removeEventListener('ended', handleUserEnd);
        playbackBtn.disabled = false;
    });
}

export function getGenreDisplayName(genre, lang = currentLanguage) {
    const langConfig = languageTexts[lang];
    const nameFromConfig = langConfig?.genreSelection?.options?.[genre];
    if (nameFromConfig) {
        return nameFromConfig;
    }
    return defaultGenreNames[genre] || genre;
}

export function getGenreTitle(lang, genre) {
    const langConfig = languageTexts[lang];
    const template = langConfig?.genreTitleTemplate;
    const displayName = getGenreDisplayName(genre, lang);
    if (template) {
        return template.replace(/\{genre\}/g, displayName);
    }
    return `${displayName}非遗文化数字平台`;
}

export function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function updateGenrePageContent(lang) {
    const langConfig = languageTexts[lang];
    const genreContent = langConfig?.genreSelection;
    const titleEl = document.getElementById('genre-page-title');
    const descEl = document.getElementById('genre-page-desc');
    const backBtn = document.getElementById('genre-back-btn');
    if (titleEl) {
        titleEl.textContent = genreContent?.title || getGenreTitle(lang, 'baiju');
    }
    if (descEl) {
        descEl.textContent = genreContent?.description || '请选择曲种';
    }
    const optionIds = {
        baiju: 'genre-option-baiju',
        kunqu: 'genre-option-kunqu',
        pintang: 'genre-option-pintang',
        yangju: 'genre-option-yangju'
    };
    Object.entries(optionIds).forEach(([genreKey, elementId]) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.textContent = getGenreDisplayName(genreKey, lang);
    });
    if (backBtn) {
        backBtn.textContent = genreContent?.backToLanguage || langConfig?.backBtn || '返回语言选择';
    }
}

const conversationConfigs = {
    'zh-CN': {
        title: '互动问答',
        userLabel: '访客',
        assistantLabel: '传承人',
        inputPlaceholder: '请输入您的问题或向我点唱...',
        sendButton: '发送',
        voiceButtonIdle: '语音提问',
        voiceButtonListening: '停止录音',
        autoDetectLabel: '自动识别语言',
        ttsLabel: '语音播报',
        detectedLanguageLabel: '识别语言：',
        noDetection: '待识别',
        welcome: '您好，我是白局数字传承人，很高兴与您交流。可以问我白局相关问题，或让我演唱经典唱段。',
        listening: '正在聆听，请开口说话……',
        recognitionUnsupported: '当前浏览器暂不支持语音识别，请使用最新版的 Chrome 或 Edge 浏览器。',
        thinking: '让我想一想……',
        ttsPlaying: '语音播报中…',
        ttsStopped: '语音播报已结束。',
        error: '抱歉，我暂时无法处理，请稍后再试。',
        noSpeech: '未检测到语音，请重试。',
        audioCapture: '无法访问麦克风，请检查权限设置。',
        networkError: '网络错误，请检查网络连接。',
        permissionDenied: '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风。',
        serviceNotAllowed: '语音识别服务不可用，请稍后再试。',
        httpsRequired: '语音识别需要HTTPS连接，请使用安全连接访问。',
        languageNames: {
            'zh-CN': '中文',
            'en': '英语',
            'es': '西班牙语',
            'fr': '法语',
            'ja': '日语',
            'ar': '阿拉伯语'
        },
        responses: {
            greeting: '您好！欢迎来到南京白局数字平台。',
            intro: '白局是南京地区的传统曲艺，起源于明代，因演唱时穿着白色长衫而得名，唱词通俗、旋律清亮，是国家级非物质文化遗产。',
            history: '白局由明清时期的说唱形式发展而来，融合了民间说唱、琴曲等元素，清末民初进入茶馆戏台，代表人物有朱自清、吴树德等传承人。',
            instrument: '白局常用乐器有扬琴、琵琶、三弦、笛子等，演唱者还会以手拍节，形成“口唱手打”的特色表现。',
            costume: '传统白局演员多穿白色长衫配腰带，女性还会搭配绣花披肩和头饰，以突出素雅端庄的舞台形象。',
            default: '我可以为您介绍白局的历史、曲目、传承人，也可以为您演唱{song1}、{song2}等唱段，欢迎提问！',
            singGeneric: '好的，我这就为您献上{song}，请您欣赏。',
            singSong1: '好的，马上为您演唱{song}，再现秦淮灯火的风情。',
            singSong2: '收到，让我们一起感受{song}中南京四季的光景。',
            singSong3: '没问题，{song}将带您品味南京的风味故事。'
        }
    },
    'en': {
        title: 'Interactive Q&A',
        userLabel: 'Visitor',
        assistantLabel: 'Inheritor',
        inputPlaceholder: 'Ask a question or request a song...',
        sendButton: 'Send',
        voiceButtonIdle: 'Voice Question',
        voiceButtonListening: 'Stop Recording',
        autoDetectLabel: 'Auto language detection',
        ttsLabel: 'Voice reply',
        detectedLanguageLabel: 'Detected language:',
        noDetection: 'Pending',
        welcome: 'Hello, I am the digital inheritor of Baiju. Feel free to ask about Baiju or request a classic excerpt.',
        listening: 'Listening... please speak clearly.',
        recognitionUnsupported: 'Speech recognition is not supported in this browser. Please try the latest Chrome or Edge.',
        thinking: 'Let me think...',
        ttsPlaying: 'Playing voice reply...',
        ttsStopped: 'Voice reply stopped.',
        error: 'Sorry, I could not process that. Please try again.',
        noSpeech: 'No speech detected. Please try again.',
        audioCapture: 'Cannot access microphone. Please check permissions.',
        networkError: 'Network error. Please check your connection.',
        permissionDenied: 'Microphone permission denied. Please allow microphone access in browser settings.',
        serviceNotAllowed: 'Speech recognition service unavailable. Please try again later.',
        httpsRequired: 'Speech recognition requires HTTPS. Please use a secure connection.',
        languageNames: {
            'zh-CN': 'Chinese',
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'ja': 'Japanese',
            'ar': 'Arabic'
        },
        responses: {
            greeting: 'Hello! Welcome to the Nanjing Baiju digital platform.',
            intro: 'Baiju is a traditional narrative singing art from Nanjing. It began in the Ming dynasty and was named after the white robes performers wore. The lyrics are vivid, the melodies bright, and it is listed as a National Intangible Cultural Heritage.',
            history: 'Baiju evolved from storytelling arts in the Ming and Qing dynasties, blending folk ballads and instrumental styles. It flourished in teahouses during the late Qing and early Republic eras, with masters such as Zhu Ziqing and Wu Shude carrying it forward.',
            instrument: 'Typical Baiju accompaniment includes yangqin, pipa, sanxian, and dizi. Performers also clap rhythm with their hands, creating the signature “singing with handmade percussion” style.',
            costume: 'Traditional performers wear long white gowns with sashes, while female artists may add embroidered shawls and hair ornaments to highlight an elegant stage presence.',
            default: 'I can introduce Baiju history, repertoire, and inheritors, or sing excerpts such as {song1} and {song2}. Feel free to ask!',
            singGeneric: 'Sure, let me sing {song} for you.',
            singSong1: 'With pleasure. Enjoy {song} and the festive glow of Qinhuai.',
            singSong2: 'Certainly. Let\'s experience the four seasons of Nanjing in {song}.',
            singSong3: 'Of course. {song} shares the flavorful stories of Nanjing.'
        }
    },
    'es': {
        title: 'Preguntas interactivas',
        userLabel: 'Visitante',
        assistantLabel: 'Heredero',
        inputPlaceholder: 'Haz una pregunta o pide una canción...',
        sendButton: 'Enviar',
        voiceButtonIdle: 'Pregunta por voz',
        voiceButtonListening: 'Detener grabación',
        autoDetectLabel: 'Detectar idioma automáticamente',
        ttsLabel: 'Respuesta por voz',
        detectedLanguageLabel: 'Idioma detectado:',
        noDetection: 'En espera',
        welcome: 'Hola, soy el heredero digital del Baiju. Puedes preguntarme sobre el Baiju o pedirme un fragmento clásico.',
        listening: 'Escuchando... por favor habla con claridad.',
        recognitionUnsupported: 'El reconocimiento de voz no está disponible en este navegador. Prueba con la última versión de Chrome o Edge.',
        thinking: 'Déjame pensar...',
        ttsPlaying: 'Reproduciendo respuesta de voz...',
        ttsStopped: 'Respuesta de voz detenida.',
        error: 'Lo siento, no pude procesarlo. Inténtalo de nuevo.',
        noSpeech: 'No se detectó voz. Por favor, inténtalo de nuevo.',
        audioCapture: 'No se puede acceder al micrófono. Por favor, verifica los permisos.',
        networkError: 'Error de red. Por favor, verifica tu conexión.',
        permissionDenied: 'Permiso de micrófono denegado. Por favor, permite el acceso al micrófono en la configuración del navegador.',
        serviceNotAllowed: 'El servicio de reconocimiento de voz no está disponible. Por favor, inténtalo más tarde.',
        httpsRequired: 'El reconocimiento de voz requiere HTTPS. Por favor, usa una conexión segura.',
        languageNames: {
            'zh-CN': 'Chino',
            'en': 'Inglés',
            'es': 'Español',
            'fr': 'Francés',
            'ja': 'Japonés',
            'ar': 'Árabe'
        },
        responses: {
            greeting: '¡Hola! Bienvenido a la plataforma digital del Baiju de Nankín.',
            intro: 'El Baiju es un arte tradicional de canto narrativo originario de Nankín. Surgió en la dinastía Ming y se nombra por las túnicas blancas que usaban los intérpretes. Las letras son populares, las melodías brillantes y está reconocido como Patrimonio Cultural Inmaterial nacional.',
            history: 'El Baiju evolucionó a partir de formas narrativas de las épocas Ming y Qing, combinando baladas populares y estilos instrumentales. A finales de la dinastía Qing y comienzos de la República floreció en los salones de té, con maestros como Zhu Ziqing y Wu Shude como referentes.',
            instrument: 'Los instrumentos habituales incluyen yangqin, pipa, sanxian y dizi. Los intérpretes también marcan el ritmo con las palmas, creando el estilo característico de “cantar y percutir con las manos”.',
            costume: 'Los artistas tradicionales visten largas túnicas blancas con cinturón; las intérpretes suelen añadir chales bordados y adornos en el cabello para resaltar una presencia escénica elegante.',
            default: 'Puedo contarte sobre la historia, el repertorio y los herederos del Baiju, o cantar fragmentos como {song1} y {song2}. ¡Pregúntame lo que quieras!',
            singGeneric: 'Claro, cantaré {song} para ti.',
            singSong1: 'Con gusto, disfruta {song} y el ambiente festivo del Qinhuai.',
            singSong2: 'Perfecto, vivamos las cuatro estaciones de Nankín en {song}.',
            singSong3: 'Por supuesto, {song} te llevará a saborear las historias gastronómicas de Nankín.'
        }
    },
    'fr': {
        title: 'Questions interactives',
        userLabel: 'Visiteur',
        assistantLabel: 'Héritier',
        inputPlaceholder: 'Posez une question ou demandez un air...',
        sendButton: 'Envoyer',
        voiceButtonIdle: 'Question vocale',
        voiceButtonListening: 'Arrêter l\'enregistrement',
        autoDetectLabel: 'Détection automatique de la langue',
        ttsLabel: 'Réponse vocale',
        detectedLanguageLabel: 'Langue détectée :',
        noDetection: 'En attente',
        welcome: 'Bonjour, je suis l\'héritier numérique du Baiju. N\'hésitez pas à me poser vos questions ou à me demander un extrait.',
        listening: 'À l\'écoute... veuillez parler clairement.',
        recognitionUnsupported: 'La reconnaissance vocale n\'est pas disponible sur ce navigateur. Essayez la dernière version de Chrome ou Edge.',
        thinking: 'Laissez-moi réfléchir...',
        ttsPlaying: 'Lecture de la réponse vocale...',
        ttsStopped: 'Réponse vocale terminée.',
        error: 'Désolé, je ne peux pas traiter votre demande pour le moment.',
        noSpeech: 'Aucune voix détectée. Veuillez réessayer.',
        audioCapture: 'Impossible d\'accéder au microphone. Veuillez vérifier les permissions.',
        networkError: 'Erreur réseau. Veuillez vérifier votre connexion.',
        permissionDenied: 'Permission du microphone refusée. Veuillez autoriser l\'accès au microphone dans les paramètres du navigateur.',
        serviceNotAllowed: 'Le service de reconnaissance vocale n\'est pas disponible. Veuillez réessayer plus tard.',
        httpsRequired: 'La reconnaissance vocale nécessite HTTPS. Veuillez utiliser une connexion sécurisée.',
        languageNames: {
            'zh-CN': 'Chinois',
            'en': 'Anglais',
            'es': 'Espagnol',
            'fr': 'Français',
            'ja': 'Japonais',
            'ar': 'Arabe'
        },
        responses: {
            greeting: 'Bonjour ! Bienvenue sur la plateforme numérique du Baiju de Nankin.',
            intro: 'Le Baiju est un art vocal narratif traditionnel de Nankin. Apparu sous la dynastie Ming, il doit son nom aux longues robes blanches des interprètes. Les paroles sont populaires, la mélodie claire, et il est inscrit au patrimoine culturel immatériel national.',
            history: 'Le Baiju s\'est développé à partir des arts de récit des époques Ming-Qing, mêlant ballades populaires et accompagnements instrumentaux. À la fin des Qing et au début de la République, il prospère dans les maisons de thé, porté par des maîtres tels que Zhu Ziqing et Wu Shude.',
            instrument: 'L\'accompagnement comprend souvent le yangqin, le pipa, le sanxian et la flûte dizi. Les chanteurs marquent aussi le rythme avec les mains, créant le style typique « chanter et frapper ».',
            costume: 'Traditionnellement, les artistes portent une longue robe blanche ceinturée ; les interprètes féminines ajoutent un châle brodé et des ornements de coiffure pour souligner l\'élégance scénique.',
            default: 'Je peux vous présenter l\'histoire, le répertoire et les héritiers du Baiju, ou chanter des airs comme {song1} et {song2}. Posez-moi vos questions !',
            singGeneric: 'Très bien, je vous interprète {song}.',
            singSong1: 'Avec plaisir. Profitons ensemble de l\'ambiance festive de {song}.',
            singSong2: 'Bien entendu. Découvrons les quatre saisons de Nankin dans {song}.',
            singSong3: 'Bien sûr. {song} vous fera goûter aux saveurs de Nankin.'
        }
    },
    'ja': {
        title: 'インタラクティブQ&A',
        userLabel: '来訪者',
        assistantLabel: '伝承者',
        inputPlaceholder: '質問やリクエストを入力してください...',
        sendButton: '送信',
        voiceButtonIdle: '音声で質問',
        voiceButtonListening: '録音を停止',
        autoDetectLabel: '言語を自動認識',
        ttsLabel: '音声で回答',
        detectedLanguageLabel: '認識言語：',
        noDetection: '待機中',
        welcome: 'こんにちは、私は白局のデジタル伝承者です。白局についての質問や演唱のリクエストをどうぞ。',
        listening: '傾聴中です。はっきりとお話しください。',
        recognitionUnsupported: 'このブラウザでは音声認識が利用できません。最新版のChromeまたはEdgeをお試しください。',
        thinking: '少々お待ちください…',
        ttsPlaying: '音声回答を再生しています...',
        ttsStopped: '音声再生を終了しました。',
        error: '申し訳ありません。うまく処理できませんでした。もう一度お試しください。',
        noSpeech: '音声が検出されませんでした。もう一度お試しください。',
        audioCapture: 'マイクにアクセスできません。権限設定を確認してください。',
        networkError: 'ネットワークエラー。接続を確認してください。',
        permissionDenied: 'マイクの権限が拒否されました。ブラウザの設定でマイクへのアクセスを許可してください。',
        serviceNotAllowed: '音声認識サービスが利用できません。後でもう一度お試しください。',
        httpsRequired: '音声認識にはHTTPS接続が必要です。安全な接続を使用してください。',
        languageNames: {
            'zh-CN': '中国語',
            'en': '英語',
            'es': 'スペイン語',
            'fr': 'フランス語',
            'ja': '日本語',
            'ar': 'アラビア語'
        },
        responses: {
            greeting: 'こんにちは！南京白局デジタルプラットフォームへようこそ。',
            intro: '白局は南京で生まれた伝統的な語り物の歌芸です。明代に起源をもち、白い長衣を着て演じたことからこの名がつきました。詞は親しみやすく旋律は澄んでおり、国家級非物質文化遺産に指定されています。',
            history: '白局は明清期の語り芸から発展し、民間の歌や器楽の要素を取り入れました。清末から民国期には茶館の舞台で盛んになり、朱自清や呉樹徳などの伝承者が活躍しました。',
            instrument: '伴奏には揚琴・琵琶・三弦・笛子などが用いられ、演者は手拍子でリズムを取り、独特の「歌って手で打つ」スタイルを生み出します。',
            costume: '伝統的な出演者は白い長衣に帯を締め、女性は刺繍のショールや髪飾りを合わせ、清雅な舞台姿を表現します。',
            default: '白局の歴史や曲目、伝承者についてご紹介したり、{song1}や{song2}などを演唱することもできます。どうぞお気軽にお尋ねください。',
            singGeneric: '承知しました。{song}をお聴きください。',
            singSong1: '喜んで。秦淮灯会の華やかさを描く{song}をお届けします。',
            singSong2: 'かしこまりました。南京の四季を描く{song}を一緒に味わいましょう。',
            singSong3: 'もちろんです。{song}で南京の味わいをご堪能ください。'
        }
    },
    'ar': {
        title: 'أسئلة تفاعلية',
        userLabel: 'الزائر',
        assistantLabel: 'الوارث',
        inputPlaceholder: 'اكتب سؤالك أو اطلب مقطعاً غنائياً...',
        sendButton: 'إرسال',
        voiceButtonIdle: 'سؤال صوتي',
        voiceButtonListening: 'إيقاف التسجيل',
        autoDetectLabel: 'التعرّف التلقائي على اللغة',
        ttsLabel: 'إجابة صوتية',
        detectedLanguageLabel: 'اللغة المكتشفة:',
        noDetection: 'بانتظار',
        welcome: 'مرحباً، أنا الوريث الرقمي لفن البايجو. يمكنك سؤالي عن البايجو أو طلب مقطع غنائي كلاسيكي.',
        listening: 'أستمع إليك... الرجاء التحدث بوضوح.',
        recognitionUnsupported: 'التعرّف على الصوت غير متاح في هذا المتصفح. يرجى تجربة أحدث نسخة من Chrome أو Edge.',
        thinking: 'دعني أفكر...',
        ttsPlaying: 'جاري تشغيل الإجابة الصوتية...',
        ttsStopped: 'توقفت الإجابة الصوتية.',
        error: 'عذراً، تعذّر المعالجة. حاول مرة أخرى.',
        noSpeech: 'لم يتم اكتشاف صوت. يرجى المحاولة مرة أخرى.',
        audioCapture: 'لا يمكن الوصول إلى الميكروفون. يرجى التحقق من الصلاحيات.',
        networkError: 'خطأ في الشبكة. يرجى التحقق من الاتصال.',
        permissionDenied: 'تم رفض إذن الميكروفون. يرجى السماح بالوصول إلى الميكروفون في إعدادات المتصفح.',
        serviceNotAllowed: 'خدمة التعرف على الصوت غير متاحة. يرجى المحاولة لاحقاً.',
        httpsRequired: 'التعرف على الصوت يتطلب HTTPS. يرجى استخدام اتصال آمن.',
        languageNames: {
            'zh-CN': 'الصينية',
            'en': 'الإنجليزية',
            'es': 'الإسبانية',
            'fr': 'الفرنسية',
            'ja': 'اليابانية',
            'ar': 'العربية'
        },
        responses: {
            greeting: 'مرحباً! أهلاً بك في المنصة الرقمية لفن البايجو في نانجينغ.',
            intro: 'البايجو فن غنائي قصصي تقليدي من نانجينغ، ظهر في عهد أسرة مينغ وسُمّي نسبة إلى الثياب البيضاء التي يرتديها المؤدون. كلماته قريبة من الجمهور وألحانه رقيقة، وقد أُدرج ضمن قائمة التراث الثقافي غير المادي الوطني.',
            history: 'تطور البايجو من فنون السرد في عهدي مينغ وتشينغ، ودمج عناصر من الأغاني الشعبية والآلات الموسيقية. ازدهر في مقاهي الشاي أواخر أسرة تشينغ وبداية الجمهورية، ومن رواده البارزين الأساتذة تشو تسي تشينغ ووو شو ده.',
            instrument: 'تشمل الآلات المصاحبة عادةً اليانغتشين والبيبا والسانشيان والناي الصيني (دزي). كما يضرب المؤدي الإيقاع بكفيه، فيبرز أسلوب «الغناء مع الإيقاع اليدوي» المميز.',
            costume: 'يرتدي الفنانون التقليديون أردية بيضاء طويلة مع حزام، وتضيف المؤديات شالات مطرزة وزينة للشعر لإبراز هيئة مسرحية أنيقة.',
            default: 'يمكنني إطلاعك على تاريخ البايجو ومقاطعه وورّاثه، أو أن أؤدي مقاطع مثل {song1} و{song2}. لا تتردد في طرح سؤالك!',
            singGeneric: 'بكل سرور، سأؤدي {song} من أجلك.',
            singSong1: 'حاضر، استمتع بأجواء مهرجان أضواء تشينهواي مع {song}.',
            singSong2: 'بكل تأكيد، فلنعيش معاً فصول نانجينغ الأربعة في {song}.',
            singSong3: 'أكيد، {song} سيأخذك في رحلة بين نكهات نانجينغ.'
        }
    }
};

const recognitionLangMap = {
    'zh-CN': 'zh-CN',
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'ja': 'ja-JP',
    'ar': 'ar-SA'
};

const ttsLangMap = {
    'zh-CN': 'zh-CN',
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'ja': 'ja-JP',
    'ar': 'ar-SA'
};

const conversationState = {
    autoDetect: true,
    ttsEnabled: true,
    recognitionSupported: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    speechSupported: 'speechSynthesis' in window,
    recognition: null,
    isListening: false,
    labels: null,
    elements: {},
    currentStatusType: 'idle',
    lastDetectedLang: 'zh-CN',
    initialized: false
};


const trainingState = {
    currentGenre: 'baiju',
    currentTrack: null,
    audioContext: null,
    analyser: null,
    mediaStream: null,
    mediaRecorder: null,
    recordingChunks: [],
    animationId: null,
    pitchHistory: [],
    beatTimes: [],
    lastBeatAt: 0,
    metrics: {
        pitchError: [],
        beatDiff: [],
        clarity: []
    },
    isTraining: false,
    startTimestamp: 0,
    elapsedSeconds: 0,
    expectedBeatInterval: 0,
    lastLyricIndex: -1
};

// 注意：languageTexts 已从 './data/languageTexts.js' 导入，不需要在这里重新定义

// 当前选择的语言
let currentLanguage = 'zh-CN';
// 已删除重复定义（原第 740-1374 行），保留注释作为提醒

// 当前选择的曲种（默认白局）
let currentGenre = 'baiju';
// 记录基线文本，用于不同曲种的动态替换（避免多次替换叠加）
const originalTexts = {};
const replaceTextIds = [
    'feature-title',
    'feature-description',
    'feature1-title',
    'feature1-desc',
    'feature2-title',
    'feature2-desc',
    'feature3-title',
    'feature3-desc',
    'feature4-title',
    'feature4-desc',
    'feature5-title',
    'feature5-desc',
    'feature6-title',
    'feature6-desc',
    'f1-title',
    'f1-desc',
    'f2-title',
    'f2-desc',
    'f3-title',
    'f3-desc',
    'f4-title',
    'f4-desc',
    'f5-title',
    'f5-desc',
    'f6-title',
    'f6-desc'
];
const defaultGenreNames = {
    baiju: '白局',
    kunqu: '昆曲',
    pintang: '苏州评弹',
    yangju: '扬剧'
};
let currentBaseGenreName = defaultGenreNames.baiju;

export function setupConversation() {
    if (conversationState.initialized) {
        updateConversationLanguage(currentLanguage);
        if (conversationState.autoDetect) {
            updateDetectedLanguageDisplay(null);
        } else {
            updateDetectedLanguageDisplay(currentLanguage);
        }
        updateRecognitionLanguage();
        return;
    }

    conversationState.initialized = true;
    conversationState.elements = {
        panel: document.getElementById('feature1-conversation-panel'),
        title: document.getElementById('feature1-conversation-title'),
        autoDetectCheckbox: document.getElementById('feature1-auto-detect'),
        autoLabel: document.getElementById('feature1-auto-label'),
        ttsToggle: document.getElementById('feature1-tts-toggle'),
        ttsLabel: document.getElementById('feature1-tts-label'),
        detectedLanguageLabel: document.getElementById('feature1-detected-language-label'),
        detectedLanguageText: document.getElementById('feature1-detected-language-text'),
        status: document.getElementById('feature1-status-text'),
        chatLog: document.getElementById('feature1-chat-log'),
        voiceBtn: document.getElementById('feature1-voice-btn'),
        input: document.getElementById('feature1-question-input'),
        sendBtn: document.getElementById('feature1-send-btn')
    };

    updateConversationLanguage(currentLanguage);
    resetConversation(currentLanguage);
    initSpeechRecognition();
    updateRecognitionLanguage();

    if (!conversationState.speechSupported && conversationState.elements.ttsToggle) {
        conversationState.ttsEnabled = false;
        conversationState.elements.ttsToggle.checked = false;
        conversationState.elements.ttsToggle.disabled = true;
    }

    if (conversationState.elements.sendBtn) {
        conversationState.elements.sendBtn.addEventListener('click', () => {
            const value = conversationState.elements.input.value.trim();
            if (!value) {
                return;
            }
            conversationState.elements.input.value = '';
            handleUserQuery(value);
        });
    }

    if (conversationState.elements.input) {
        conversationState.elements.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const value = conversationState.elements.input.value.trim();
                if (!value) {
                    return;
                }
                conversationState.elements.input.value = '';
                handleUserQuery(value);
            }
        });
    }

    if (conversationState.elements.autoDetectCheckbox) {
        conversationState.elements.autoDetectCheckbox.addEventListener('change', (event) => {
            conversationState.autoDetect = event.target.checked;
            if (conversationState.autoDetect) {
                updateDetectedLanguageDisplay(null);
            } else {
                updateDetectedLanguageDisplay(currentLanguage);
            }
        });
    }

    if (conversationState.elements.ttsToggle) {
        conversationState.elements.ttsToggle.addEventListener('change', (event) => {
            conversationState.ttsEnabled = event.target.checked;
            if (!conversationState.ttsEnabled) {
                stopSpeech();
                setConversationStatus(conversationState.labels.ttsStopped, 'info');
            }
        });
    }

    if (conversationState.elements.voiceBtn) {
        conversationState.elements.voiceBtn.addEventListener('click', toggleVoiceRecognition);
        if (!conversationState.recognitionSupported) {
            conversationState.elements.voiceBtn.disabled = true;
        }
    }

    if (!conversationState.recognitionSupported) {
        setConversationStatus(conversationState.labels.recognitionUnsupported, 'info');
    }
}

export function updateConversationLanguage(lang) {
    const labels = conversationConfigs[lang] || conversationConfigs['zh-CN'];
    conversationState.labels = labels;

    if (conversationState.elements.title) {
        conversationState.elements.title.textContent = labels.title;
    }
    if (conversationState.elements.autoLabel) {
        conversationState.elements.autoLabel.textContent = labels.autoDetectLabel;
    }
    if (conversationState.elements.ttsLabel) {
        conversationState.elements.ttsLabel.textContent = labels.ttsLabel;
    }
    if (conversationState.elements.detectedLanguageLabel) {
        conversationState.elements.detectedLanguageLabel.textContent = labels.detectedLanguageLabel;
    }
    if (conversationState.elements.input) {
        conversationState.elements.input.setAttribute('placeholder', labels.inputPlaceholder);
    }
    if (conversationState.elements.sendBtn) {
        conversationState.elements.sendBtn.textContent = labels.sendButton;
    }

    updateVoiceButtonLabel(conversationState.isListening ? labels.voiceButtonListening : labels.voiceButtonIdle);

    if (conversationState.autoDetect) {
        updateDetectedLanguageDisplay(null);
    } else {
        updateDetectedLanguageDisplay(lang);
    }

    if (!conversationState.recognitionSupported) {
        setConversationStatus(labels.recognitionUnsupported, 'info');
    }
}

export function resetConversation(lang) {
    const chatLog = conversationState.elements.chatLog;
    if (chatLog) {
        chatLog.innerHTML = '';
    }
    const labels = conversationConfigs[lang] || conversationConfigs['zh-CN'];
    appendChatMessage('assistant', labels.welcome, lang);
    conversationState.lastDetectedLang = lang;
    if (conversationState.autoDetect) {
        updateDetectedLanguageDisplay(null);
    } else {
        updateDetectedLanguageDisplay(lang);
    }
    clearStatusIfMatch('thinking');
}

export function appendChatMessage(role, text, lang) {
    const chatLog = conversationState.elements.chatLog;
    if (!chatLog) {
        return;
    }
    const message = document.createElement('div');
    message.classList.add('chat-message', role);
    message.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    const labelConfig = conversationConfigs[lang] || conversationConfigs[currentLanguage] || conversationConfigs['zh-CN'];
    const name = role === 'user' ? labelConfig.userLabel : labelConfig.assistantLabel;

    const nameEl = document.createElement('div');
    nameEl.classList.add('chat-name');
    nameEl.textContent = name;

    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble');
    bubble.textContent = text;

    message.appendChild(nameEl);
    message.appendChild(bubble);
    chatLog.appendChild(message);
    chatLog.scrollTop = chatLog.scrollHeight;
}

export function setConversationStatus(text, type = 'info') {
    conversationState.currentStatusType = type;
    if (conversationState.elements.status) {
        conversationState.elements.status.textContent = text || '';
    }
}

export function clearStatusIfMatch(type) {
    if (conversationState.currentStatusType === type) {
        setConversationStatus('', 'idle');
    }
}

export function updateDetectedLanguageDisplay(langCode) {
    const displayEl = conversationState.elements.detectedLanguageText;
    if (!displayEl) {
        return;
    }
    const labels = conversationState.labels || conversationConfigs[currentLanguage] || conversationConfigs['zh-CN'];
    if (!langCode) {
        displayEl.textContent = labels.noDetection;
        return;
    }
    displayEl.textContent = labels.languageNames[langCode] || labels.languageNames[currentLanguage] || langCode;
}

export function detectConversationLanguage(text) {
    if (!text) {
        return currentLanguage;
    }
    if (/[\u4e00-\u9fff]/.test(text)) {
        return 'zh-CN';
    }
    if (/[\u3040-\u30ff]/.test(text)) {
        return 'ja';
    }
    if (/[\u0600-\u06FF]/.test(text)) {
        return 'ar';
    }
    if (/[ñáéíóúü¡¿]/i.test(text)) {
        return 'es';
    }
    if (/[çàâéèêëîïôûùœæ]/i.test(text)) {
        return 'fr';
    }
    return 'en';
}

export function getSongDisplayNameByLanguage(langCode, songId) {
    const langData = languageTexts[langCode] || languageTexts[currentLanguage] || languageTexts['zh-CN'];
    const f1 = langData?.f1;
    if (!f1) {
        return songId;
    }
    const map = {
        song1: f1.song1,
        song2: f1.song2,
        song3: f1.song3
    };
    return map[songId] || songId;
}

export function formatText(template, replacements) {
    if (typeof template !== 'string') {
        return '';
    }
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        return replacements && Object.prototype.hasOwnProperty.call(replacements, key)
            ? replacements[key]
            : '';
    });
}

export function generateAssistantResponse(text, langCode) {
    const config = conversationConfigs[langCode] || conversationConfigs[currentLanguage] || conversationConfigs['zh-CN'];
    const responses = config.responses;
    const lower = text.toLowerCase();
    const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const replacements = {
        song1: getSongDisplayNameByLanguage(langCode, 'song1'),
        song2: getSongDisplayNameByLanguage(langCode, 'song2'),
        song3: getSongDisplayNameByLanguage(langCode, 'song3')
    };

    let messageKey = 'default';
    let songIntent = null;

    if (/(你好|您好|hello|hi|hey|hola|bonjour|salut|こんにちは|こんばんは|やあ|مرحبا|أهلاً|اهلا)/i.test(text)) {
        messageKey = 'greeting';
    } else if (/(白局是什么|介绍|what is|what\'s|what is baiju|qué es|qué es el|qu\'est-ce que|de quoi s\'agit-il|とは|って何|とは何ですか|ما هو|ماهي|ما هي)/i.test(text)) {
        messageKey = 'intro';
    } else if (/(历史|起源|传承|背景|history|origin|story|background|historia|origen|pasado|histoire|origine|歴史|由来|背景|تاريخ|أصل|خلفية)/i.test(text)) {
        messageKey = 'history';
    } else if (/(乐器|伴奏|instrument|instruments|instrumento|instrumentos|instrumentation|楽器|伴奏|آلات|آلة|عزف)/i.test(text)) {
        messageKey = 'instrument';
    } else if (/(服饰|服装|衣着|costume|dress|clothes|attire|vestuario|indumentaria|tenue|衣装|衣服|装い|زي|ملابس|أزياء)/i.test(text)) {
        messageKey = 'costume';
    } else if (/秦淮灯会/.test(text) || /qinhuai/.test(normalized) || /lantern/.test(normalized)) {
        messageKey = 'singSong1';
        songIntent = 'song1';
    } else if (/金陵四季/.test(text) || /jinling/.test(normalized) || /four seasons/.test(normalized) || /seasons/.test(normalized)) {
        messageKey = 'singSong2';
        songIntent = 'song2';
    } else if (/南京美食/.test(text) || /taste of nanjing/.test(normalized) || /nanjing flavors/.test(normalized) || /sabores de nanjing/.test(normalized) || /saveurs de nanjing/.test(normalized) || /南京の味/.test(text) || /نكهات/.test(text)) {
        messageKey = 'singSong3';
        songIntent = 'song3';
    } else if (/(唱|演唱|来一段|唱一段|歌|点歌|sing|song|perform|singing|cantar|cántame|chanter|chante|歌って|歌を|غن|غناء|أد)/i.test(text)) {
        messageKey = 'singGeneric';
        songIntent = 'song1';
    }

    if (songIntent) {
        replacements.song = getSongDisplayNameByLanguage(langCode, songIntent);
        triggerPerformance(songIntent);
    }

    const template = responses[messageKey] || responses.default;
    const finalMessage = formatText(template, replacements);
    return {message: finalMessage, langCode};
}

export function triggerPerformance(songId) {
    isPerforming = true;
    currentPerformance = songId;
    playPerformance(songId);
}

export function handleUserQuery(text) {
    if (!text) {
        return;
    }
    if (!conversationState.labels) {
        updateConversationLanguage(currentLanguage);
    }
    const detectedLang = conversationState.autoDetect ? detectConversationLanguage(text) : currentLanguage;
    conversationState.lastDetectedLang = detectedLang;

    if (conversationState.autoDetect) {
        updateDetectedLanguageDisplay(detectedLang);
    } else {
        updateDetectedLanguageDisplay(currentLanguage);
    }

    appendChatMessage('user', text, detectedLang);
    clearStatusIfMatch('listening');
    setConversationStatus(conversationState.labels.thinking, 'thinking');

    const response = generateAssistantResponse(text, detectedLang);
    appendChatMessage('assistant', response.message, detectedLang);

    if (conversationState.ttsEnabled && conversationState.speechSupported) {
        stopSpeech();
        speakText(response.message, detectedLang);
    } else {
        clearStatusIfMatch('thinking');
    }
}

export function updateRecognitionLanguage() {
    if (!conversationState.recognition) {
        return;
    }
    const lang = recognitionLangMap[currentLanguage] || 'zh-CN';
    conversationState.recognition.lang = lang;
}

export async function toggleVoiceRecognition() {
    if (!conversationState.recognitionSupported || !conversationState.recognition) {
        setConversationStatus(conversationState.labels.recognitionUnsupported, 'info');
        return;
    }

    // 检查HTTPS（移动设备上语音识别需要HTTPS）
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        setConversationStatus(conversationState.labels.httpsRequired, 'info');
        return;
    }

    if (conversationState.isListening) {
        conversationState.recognition.stop();
        return;
    }

    // 检查麦克风权限
    try {
        const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        // 权限已授予，关闭流
        stream.getTracks().forEach(track => track.stop());
    } catch (error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setConversationStatus(conversationState.labels.permissionDenied, 'info');
            return;
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setConversationStatus(conversationState.labels.audioCapture, 'info');
            return;
        } else {
            console.error('Microphone access error:', error);
            setConversationStatus(conversationState.labels.audioCapture, 'info');
            return;
        }
    }

    try {
        conversationState.recognition.lang = recognitionLangMap[currentLanguage] || conversationState.recognition.lang;
        conversationState.recognition.start();
    } catch (error) {
        console.error('Speech recognition start error:', error);
        setConversationStatus(conversationState.labels.error, 'info');
    }
}

export function initSpeechRecognition() {
    if (!conversationState.recognitionSupported || conversationState.recognition) {
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        conversationState.recognitionSupported = false;
        if (conversationState.elements.voiceBtn) {
            conversationState.elements.voiceBtn.disabled = true;
        }
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = recognitionLangMap[currentLanguage] || 'zh-CN';

    recognition.onstart = () => {
        conversationState.isListening = true;
        if (conversationState.elements.voiceBtn) {
            conversationState.elements.voiceBtn.classList.add('listening');
        }
        updateVoiceButtonLabel(conversationState.labels.voiceButtonListening);
        setConversationStatus(conversationState.labels.listening, 'listening');
    };

    recognition.onend = () => {
        conversationState.isListening = false;
        if (conversationState.elements.voiceBtn) {
            conversationState.elements.voiceBtn.classList.remove('listening');
        }
        updateVoiceButtonLabel(conversationState.labels.voiceButtonIdle);
        if (conversationState.currentStatusType === 'listening') {
            clearStatusIfMatch('listening');
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event);
        let errorMessage = conversationState.labels.error;

        if (event.error) {
            switch (event.error) {
                case 'no-speech':
                    // no-speech 不是严重错误，只是超时，不显示错误消息
                    errorMessage = conversationState.labels.noSpeech;
                    break;
                case 'audio-capture':
                    errorMessage = conversationState.labels.audioCapture;
                    break;
                case 'network':
                    errorMessage = conversationState.labels.networkError;
                    break;
                case 'not-allowed':
                    // 检查是否是权限问题
                    if (event.message && event.message.includes('permission')) {
                        errorMessage = conversationState.labels.permissionDenied;
                    } else {
                        errorMessage = conversationState.labels.serviceNotAllowed;
                    }
                    break;
                case 'service-not-allowed':
                    errorMessage = conversationState.labels.serviceNotAllowed;
                    break;
                default:
                    errorMessage = conversationState.labels.error;
            }
        }

        // 对于 no-speech 错误，只在控制台记录，不显示给用户（因为这是正常的超时）
        if (event.error === 'no-speech') {
            console.log('Speech recognition timeout (no speech detected)');
            // 不显示错误消息，让用户知道可以重试
        } else {
            setConversationStatus(errorMessage, 'info');
        }
    };

    recognition.onresult = (event) => {
        const result = event.results && event.results[0] && event.results[0][0]
            ? event.results[0][0].transcript.trim()
            : '';
        if (result) {
            handleUserQuery(result);
        } else {
            setConversationStatus(conversationState.labels.error, 'info');
        }
    };

    conversationState.recognition = recognition;
}

export function updateVoiceButtonLabel(text) {
    if (conversationState.elements.voiceBtn) {
        conversationState.elements.voiceBtn.textContent = text;
    }
}

export function speakText(text, langCode) {
    if (!conversationState.speechSupported) {
        return;
    }
    const synthesis = window.speechSynthesis;
    if (!synthesis) {
        return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = ttsLangMap[langCode] || ttsLangMap[currentLanguage] || 'zh-CN';
    utterance.lang = targetLang;

    const voices = synthesis.getVoices();
    const matchedVoice = voices.find(voice => voice.lang && voice.lang.toLowerCase().startsWith(targetLang.toLowerCase()));
    if (matchedVoice) {
        utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
        clearStatusIfMatch('tts');
    };

    utterance.onerror = () => {
        clearStatusIfMatch('tts');
        setConversationStatus(conversationState.labels.error, 'info');
    };

    clearStatusIfMatch('thinking');
    setConversationStatus(conversationState.labels.ttsPlaying, 'tts');
    synthesis.speak(utterance);
}

export function stopSpeech() {
    if (!conversationState.speechSupported) {
        return;
    }
    const synthesis = window.speechSynthesis;
    if (!synthesis) {
        return;
    }
    synthesis.cancel();
    clearStatusIfMatch('tts');
}

// 虚拟人物表演功能
let isPerforming = false;
let currentPerformance = null;

const video = document.getElementById('virtual-video');

export function playPerformance(songId) {
    if (!video.paused) {
        video.pause();
    }
    video.currentTime = 0;

    // 加载并播放视频
    video.load();
    video.play();

    // 更新表演状态文本
    const performanceText = document.getElementById('performance-text');
    performanceText.textContent = `${languageTexts[currentLanguage].f1.statusPlaying}${getSongName(songId)}`;
}


export function stopPerformance() {
    video.pause();
    const performanceText = document.getElementById('performance-text');
    performanceText.textContent = languageTexts[currentLanguage].f1.statusStopped;
}

export function simulatePerformance(songName, duration) {
    console.log(`开始表演: ${songName}`);

    // 更新表演状态
    const performanceText = document.getElementById('performance-text');
    performanceText.textContent = `${languageTexts[currentLanguage].f1.statusPlaying}${songName}...`;

    // 模拟歌词显示
    const lyrics = getLyrics(songName);
    let currentLine = 0;

    const lyricInterval = setInterval(() => {
        if (!isPerforming) {
            clearInterval(lyricInterval);
            return;
        }

        if (currentLine < lyrics.length) {
            performanceText.textContent = lyrics[currentLine];
            currentLine++;
        }
    }, 2000); // 每2秒换一行歌词

    // 表演结束后自动停止
    setTimeout(() => {
        if (isPerforming) {
            stopPerformance();
            performanceText.textContent = languageTexts[currentLanguage].f1.performanceEnded;

            // 3秒后清空文本
            setTimeout(() => {
                performanceText.textContent = '';
            }, 3000);
        }
    }, duration);
}

export function getLyrics(songName) {
    // 这里保持旧函数未使用，歌词由 f2.sampleLyrics 提供
    return [songName];
}

// 选择语言函数
export function selectLanguage(lang) {
    console.log('选择语言:', lang);
    currentLanguage = lang;
    const langConfig = languageTexts[lang] || languageTexts['zh-CN'];
    currentBaseGenreName = langConfig?.genreBaseName || getGenreDisplayName('baiju', lang);
    currentGenre = 'baiju';

    if (!conversationState.initialized) {
        setupConversation();
    } else {
        stopSpeech();
        updateConversationLanguage(lang);
        resetConversation(lang);
        updateRecognitionLanguage();
    }

    // 更新功能页面的文本
    const featurePage = document.getElementById('feature-page');
    const genrePage = document.getElementById('genre-page');
    const detailModals = document.querySelectorAll('.feature-detail');
    if (lang === 'ar') {
        featurePage.classList.add('arabic-text');
        genrePage.classList.add('arabic-text');
        detailModals.forEach(modal => modal.classList.add('arabic-text'));
    } else {
        featurePage.classList.remove('arabic-text');
        genrePage.classList.remove('arabic-text');
        detailModals.forEach(modal => modal.classList.remove('arabic-text'));
    }

    document.getElementById('feature-title').textContent = langConfig.featureTitle;
    document.getElementById('feature-description').textContent = langConfig.featureDescription;
    document.getElementById('feature1-title').textContent = langConfig.feature1Title;
    document.getElementById('feature1-desc').textContent = langConfig.feature1Desc;
    document.getElementById('feature2-title').textContent = langConfig.feature2Title;
    document.getElementById('feature2-desc').textContent = langConfig.feature2Desc;
    document.getElementById('feature3-title').textContent = langConfig.feature3Title;
    document.getElementById('feature3-desc').textContent = langConfig.feature3Desc;
    document.getElementById('feature4-title').textContent = langConfig.feature4Title;
    document.getElementById('feature4-desc').textContent = langConfig.feature4Desc;
    document.getElementById('feature5-title').textContent = langConfig.feature5Title;
    document.getElementById('feature5-desc').textContent = langConfig.feature5Desc;
    const feedbackCard = document.querySelectorAll('.feature-card')[5];
    feedbackCard.querySelector('h3').textContent = langConfig.feature6Title;
    feedbackCard.querySelector('p').textContent = langConfig.feature6Desc;
    document.getElementById('back-btn').textContent = langConfig.backToGenres || langConfig.backBtn || '返回曲种选择';
    document.getElementById('help-btn').textContent = langConfig.helpBtn;
    updateGenrePageContent(lang);

    // 功能一弹窗文本
    const f1 = langConfig.f1;
    if (f1) {
        document.getElementById('f1-title').textContent = f1.title;
        document.getElementById('f1-desc').textContent = f1.desc;
        const elF1Choose = document.getElementById('f1-choose');
        if (elF1Choose) elF1Choose.textContent = f1.choose;
        const elF1Song1 = document.getElementById('f1-song1');
        if (elF1Song1) elF1Song1.textContent = f1.song1;
        const elF1Song2 = document.getElementById('f1-song2');
        if (elF1Song2) elF1Song2.textContent = f1.song2;
        const elF1Song3 = document.getElementById('f1-song3');
        if (elF1Song3) elF1Song3.textContent = f1.song3;
        const elF1TagClassic = document.getElementById('f1-tag-classic');
        if (elF1TagClassic) elF1TagClassic.textContent = f1.tagClassic;
        const elF1TagClassic2 = document.getElementById('f1-tag-classic-2');
        if (elF1TagClassic2) elF1TagClassic2.textContent = f1.tagClassic;
        const elF1TagModern = document.getElementById('f1-tag-modern');
        if (elF1TagModern) elF1TagModern.textContent = f1.tagModern;
        document.getElementById('f1-btn-play1').innerHTML = `<i class="fas fa-play"></i> ${f1.btnPlayPrefix}${f1.song1}${f1.btnPlaySuffix}`;
        document.getElementById('f1-btn-play2').innerHTML = `<i class="fas fa-play"></i> ${f1.btnPlayPrefix}${f1.song2}${f1.btnPlaySuffix}`;
        document.getElementById('f1-btn-stop').innerHTML = `<i class="fas fa-stop"></i> ${f1.btnStop}`;
    }

    // 功能二弹窗文本
    const f2 = langConfig.f2;
    if (f2) {
        const elF2Title = document.getElementById('f2-title');
        if (elF2Title) elF2Title.textContent = f2.title;
        const elF2Desc = document.getElementById('f2-desc');
        if (elF2Desc) elF2Desc.textContent = f2.desc;
        const elF2ChooseGenre = document.getElementById('f2-choose-genre');
        if (elF2ChooseGenre && f2.chooseGenre) elF2ChooseGenre.textContent = f2.chooseGenre;
        const elF2Choose = document.getElementById('f2-choose');
        if (elF2Choose) elF2Choose.textContent = f2.choose;
        const elLyricsTitle = document.getElementById('f2-lyrics-title');
        if (elLyricsTitle) elLyricsTitle.textContent = f2.lyricsTitle;
        const labelPitch = document.getElementById('label-pitch');
        if (labelPitch) labelPitch.textContent = f2.pitch;
        const labelRhythm = document.getElementById('label-rhythm');
        if (labelRhythm) labelRhythm.textContent = f2.rhythm;
        const labelPronunciation = document.getElementById('label-pronunciation');
        if (labelPronunciation) labelPronunciation.textContent = f2.pronunciation;
        const startBtn = document.getElementById('start-singing');
        if (startBtn && f2.start) startBtn.textContent = f2.start;
        const stopBtn = document.getElementById('stop-singing');
        if (stopBtn && f2.stop) stopBtn.textContent = f2.stop;
        const playbackBtn = document.getElementById('playback-comparison');
        if (playbackBtn && f2.playback) playbackBtn.textContent = f2.playback;

        if (typeof applyTrainingTrackSelection === 'function') {
            const trackSelect = document.getElementById('training-track-select');
            const selectedTrack = trackSelect ? trackSelect.value : null;
            applyTrainingTrackSelection(selectedTrack || (trainingLibrary[trainingState.currentGenre]?.tracks[0]?.id));
        } else if (typeof setTrainingLyrics === 'function') {
            setTrainingLyrics('song1');
        }
    }

    // 功能三弹窗文本
    const f3 = langConfig.f3;
    if (f3) {
        document.getElementById('f3-title').textContent = f3.title;
        document.getElementById('f3-desc').textContent = f3.desc;
        document.getElementById('f3-scene-title').textContent = f3.sceneTitle;
        document.getElementById('f3-scene-sub').textContent = f3.sceneSub;
        document.getElementById('f3-courses-title').textContent = f3.coursesTitle;
        document.getElementById('f3-course1-title').textContent = f3.course1Title;
        document.getElementById('f3-course1-desc').textContent = f3.course1Desc;
        document.getElementById('f3-course2-title').textContent = f3.course2Title;
        document.getElementById('f3-course2-desc').textContent = f3.course2Desc;
        document.getElementById('f3-course3-title').textContent = f3.course3Title;
        document.getElementById('f3-course3-desc').textContent = f3.course3Desc;
        document.getElementById('f3-qa-title').textContent = f3.qaTitle;
        document.getElementById('f3-qa-input').setAttribute('placeholder', f3.qaPlaceholder);
        document.getElementById('f3-qa-btn').textContent = f3.qaBtn;
    }

    // 功能四弹窗文本
    const f4 = langConfig.f4;
    if (f4) {
        document.getElementById('f4-title').textContent = f4.title;
        document.getElementById('f4-desc').textContent = f4.desc;
        document.getElementById('f4-card1-title').textContent = f4.card1Title;
        document.getElementById('f4-card1-desc').textContent = f4.card1Desc;
        document.getElementById('f4-card2-title').textContent = f4.card2Title;
        document.getElementById('f4-card2-desc').textContent = f4.card2Desc;
        document.getElementById('f4-card3-title').textContent = f4.card3Title;
        document.getElementById('f4-card3-desc').textContent = f4.card3Desc;
        document.getElementById('f4-card4-title').textContent = f4.card4Title;
        document.getElementById('f4-card4-desc').textContent = f4.card4Desc;
        document.getElementById('f4-card1-btn').textContent = f4.more;
        document.getElementById('f4-card2-btn').textContent = f4.more;
        document.getElementById('f4-card3-btn').textContent = f4.more;
        document.getElementById('f4-card4-btn').textContent = f4.more;
        document.getElementById('f4-lang-title').textContent = f4.langTitle;
    }

    // 功能五弹窗文本
    const f5 = langConfig.f5;
    if (f5) {
        document.getElementById('f5-title').textContent = f5.title;
        document.getElementById('f5-desc').textContent = f5.desc;
        document.getElementById('f5-input-title').textContent = f5.inputTitle;
        document.getElementById('f5-input').setAttribute('placeholder', f5.inputPlaceholder);
        document.getElementById('f5-select-lang-title').textContent = f5.selectLangTitle;
        document.getElementById('f5-generate-btn').textContent = f5.generateBtn;
        document.getElementById('f5-output-title').textContent = f5.outputTitle;
        document.getElementById('creation-text').textContent = f5.resultPlaceholder;
        document.getElementById('f5-preview-btn').textContent = f5.previewBtn;
        document.getElementById('f5-share-btn').textContent = f5.shareBtn;
    }

    // 功能六弹窗文本
    const f6 = langConfig.f6;
    if (f6) {
        document.getElementById('f6-title').textContent = f6.title;
        document.getElementById('f6-desc').textContent = f6.desc;
        document.getElementById('f6-type-label').textContent = f6.typeLabel;
        document.getElementById('f6-type-suggestion').textContent = f6.typeSuggestion;
        document.getElementById('f6-type-bug').textContent = f6.typeBug;
        document.getElementById('f6-type-content').textContent = f6.typeContent;
        document.getElementById('f6-type-other').textContent = f6.typeOther;
        document.getElementById('f6-title-label').textContent = f6.titleLabel;
        document.getElementById('feedback-title').setAttribute('placeholder', f6.titlePlaceholder);
        document.getElementById('f6-content-label').textContent = f6.contentLabel;
        document.getElementById('feedback-content').setAttribute('placeholder', f6.contentPlaceholder);
        document.getElementById('f6-contact-label').textContent = f6.contactLabel;
        document.getElementById('contact-info').setAttribute('placeholder', f6.contactPlaceholder);
        document.getElementById('f6-rating-label').textContent = f6.ratingLabel;
        document.getElementById('rating-text').textContent = f6.ratingText;
        document.getElementById('f6-submit-btn').textContent = f6.submitBtn;
        document.getElementById('f6-history-title').textContent = f6.historyTitle;
    }

    // 刷新基线文本（切换语言后需要更新）
    replaceTextIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) originalTexts[id] = el.textContent;
    });

    applyGenreTexts();

    // 语言选择完成，进入曲种选择页
    document.getElementById('language-page').classList.remove('active');
    document.getElementById('genre-page').style.display = ''; // 确保可见
    document.getElementById('genre-page').classList.add('active');
}

// 选择曲种后进入功能展示页面（暂时与白局相同）
export function selectTypesOfSongs(genre) {
    console.log('选择曲种:', genre);
    currentGenre = genre;
    // 更新功能页返回按钮文字
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        const langConfig = languageTexts[currentLanguage] || languageTexts['zh-CN'];
        backBtn.textContent = langConfig?.backToGenres || langConfig?.backBtn || '返回曲种选择';
    }
    // 进入功能页
    document.getElementById('genre-page').classList.remove('active');
    const pageKun = document.getElementById('feature-page-kunqu');
    const pagePin = document.getElementById('feature-page-pintang');
    const pageYan = document.getElementById('feature-page-yangju');
    document.getElementById('feature-page').classList.add('active');
    document.getElementById('feature-page').style.display = '';
    if (pageKun) {
        pageKun.classList.remove('active');
        pageKun.style.display = 'none';
    }
    if (pagePin) {
        pagePin.classList.remove('active');
        pagePin.style.display = 'none';
    }
    if (pageYan) {
        pageYan.classList.remove('active');
        pageYan.style.display = 'none';
    }
    applyGenreTexts();
}

// 根据当前曲种，动态调整页面标题及涉及“白局”的文案
export function applyGenreTexts() {
    const langConfig = languageTexts[currentLanguage] || languageTexts['zh-CN'];
    const baseName = langConfig?.genreBaseName || currentBaseGenreName || getGenreDisplayName('baiju', currentLanguage);
    const displayName = getGenreDisplayName(currentGenre, currentLanguage);
    const baseNameReg = baseName ? new RegExp(escapeRegExp(baseName), 'g') : null;
    // 主标题与简介：如果基线存在基线名称，则替换；否则使用模板
    const titleEl = document.getElementById('feature-title');
    if (titleEl) {
        const base = originalTexts['feature-title'] || titleEl.textContent;
        if (baseNameReg && baseName && base.includes(baseName)) {
            titleEl.textContent = base.replace(baseNameReg, displayName);
        } else {
            titleEl.textContent = getGenreTitle(currentLanguage, currentGenre);
        }
    }
    const descEl = document.getElementById('feature-description');
    if (descEl) {
        const base = originalTexts['feature-description'] || descEl.textContent;
        if (baseNameReg && baseName && base.includes(baseName)) {
            descEl.textContent = base.replace(baseNameReg, displayName);
        } else {
            const defaultDescTemplates = {
                'zh-CN': `探索${displayName}的数字化体验，感受传统与现代科技的融合`,
                'en': `Explore the digital experience of ${displayName} intangible cultural heritage, feel the integration of tradition and modern technology`,
                'es': `Explore la experiencia digital del patrimonio cultural inmaterial de ${displayName} y sienta la unión entre tradición y tecnología moderna`,
                'fr': `Explorez l'expérience numérique du patrimoine culturel immatériel de ${displayName} et ressentez la fusion entre tradition et technologie moderne`,
                'ja': `${displayName}の無形文化遺産デジタル体験を探り、伝統と現代技術の融合を感じましょう`,
                'ar': `استكشف التجربة الرقمية لتراث ${displayName} الثقافي غير المادي وشاهد تكامل التقاليد مع التكنولوجيا الحديثة`
            };
            descEl.textContent = defaultDescTemplates[currentLanguage] || `Explore the digital experience of ${displayName}.`;
        }
    }
    // 替换部分包含“白局”的功能描述/弹窗描述
    replaceTextIds.forEach(id => {
        if (id === 'feature-title' || id === 'feature-description') return;
        const el = document.getElementById(id);
        if (!el) return;
        const base = originalTexts[id] || el.textContent;
        if (baseNameReg && baseName && base.includes(baseName)) {
            el.textContent = base.replace(baseNameReg, displayName);
        } else {
            el.textContent = base;
        }
    });
}

// 显示功能详情
export function showFeatureDetail(featureId) {
    // 显示遮罩层
    document.getElementById('overlay').classList.add('active');

    // 隐藏所有功能详情
    document.querySelectorAll('.feature-detail').forEach(detail => {
        detail.classList.remove('active');
    });

    // 显示选中的功能详情
    document.getElementById(`${featureId}-detail`).classList.add('active');
}

// 关闭功能详情
export function closeFeatureDetail(featureId) {
    // 隐藏遮罩层
    document.getElementById('overlay').classList.remove('active');
    const activeId = document.getElementById(`${featureId}-detail-${currentGenre}`) ?
        `${featureId}-detail-${currentGenre}` : `${featureId}-detail`;
    document.getElementById(activeId).classList.remove('active');
}

// 从功能页面返回（回到曲种选择页面）
export function goBackToLanguage() {
    console.log('返回曲种选择');
    document.getElementById('feature-page').classList.remove('active');
    const pageKun = document.getElementById('feature-page-kunqu');
    const pagePin = document.getElementById('feature-page-pintang');
    const pageYan = document.getElementById('feature-page-yangju');
    if (pageKun) pageKun.classList.remove('active');
    if (pagePin) pagePin.classList.remove('active');
    if (pageYan) pageYan.classList.remove('active');
    document.getElementById('genre-page').classList.add('active');
    currentGenre = 'baiju';
    applyGenreTexts();

    // 关闭所有功能详情
    document.querySelectorAll('.feature-detail').forEach(detail => {
        detail.classList.remove('active');
    });

    // 隐藏遮罩层
    document.getElementById('overlay').classList.remove('active');
}

// 从曲种选择页面返回到语言选择
export function goBackToLanguageFromGenre() {
    console.log('返回语言选择');
    document.getElementById('genre-page').classList.remove('active');
    document.getElementById('language-page').classList.add('active');
    currentGenre = 'baiju';
    applyGenreTexts();
}

// 选择唱段
export function selectSong(songId) {
    console.log('选择唱段:', songId);
    // 可以选择唱段但不立即播放
    const performanceText = document.getElementById('performance-text');
    const f1 = languageTexts[currentLanguage].f1;
    performanceText.textContent = `${f1.statusSelected}${getSongName(songId)}${f1.statusHint}`;
}

export function getSongName(songId) {
    const f1 = languageTexts[currentLanguage].f1;
    const map = {
        'song1': f1 ? f1.song1 : 'song1',
        'song2': f1 ? f1.song2 : 'song2',
        'song3': f1 ? f1.song3 : 'song3'
    };
    const name = map[songId] || 'Unknown';
    // 返回不带引号的名称，在按钮里已处理引号
    return name;
}

// 选择训练唱段
export function selectTrainingSong(songId) {
    console.log('选择训练唱段:', songId);
    if (typeof applyTrainingTrackSelection === 'function') {
        applyTrainingTrackSelection(songId);
    } else {
        setTrainingLyrics(songId);
    }
}

export function setTrainingLyrics(songId) {
    if (typeof findTrackById === 'function' && typeof renderLyrics === 'function') {
        const track = findTrackById(songId);
        if (track) {
            renderLyrics(track);
            return;
        }
    }

    const f2 = languageTexts[currentLanguage].f2;
    const key = songId;
    const lines = (f2 && f2.sampleLyrics && f2.sampleLyrics[key]) ? f2.sampleLyrics[key] : [];
    const lyrics = document.getElementById('lyrics-display');
    if (lyrics) {
        if (lines.length) {
            lyrics.innerHTML = lines.map(line => `<div class="lyric-line">${line}</div>`).join('');
        } else {
            lyrics.innerHTML = `<div class="lyric-line">...</div>`;
        }
    }
}

// 选择课程
export function selectCourse(courseId) {
    console.log('选择课程:', courseId);
    // 这里可以加载课程内容
}

export function initStarRating() {
    const stars = document.querySelectorAll('.star');
    const ratingText = document.getElementById('rating-text');
    let selectedRating = 0;

    stars.forEach(star => {
        star.addEventListener('mouseover', function () {
            const rating = parseInt(this.getAttribute('data-rating'));
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        });
    });

    document.querySelector('.rating-stars').addEventListener('mouseout', function () {
        stars.forEach((s, index) => {
            if (index < selectedRating) {
                s.classList.add('active');
                s.classList.remove('hover');
            } else {
                s.classList.remove('active');
                s.classList.remove('hover');
            }
        });
    });

    stars.forEach(star => {
        star.addEventListener('click', function () {
            selectedRating = parseInt(this.getAttribute('data-rating'));
            stars.forEach((s, index) => {
                if (index < selectedRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
            ratingText.textContent = `评分: ${selectedRating}星`;
        });
    });
}

// 帮助按钮点击事件
export function showHelp() {
    let message = '';
    if (currentLanguage === 'zh-CN') {
        message = '如需帮助，请联系我们的客服团队。\n电话: 400-123-4567\n邮箱: support@baiju-nj.com';
    } else if (currentLanguage === 'en') {
        message = 'For assistance, please contact our customer service team.\nPhone: 400-123-4567\nEmail: support@baiju-nj.com';
    } else if (currentLanguage === 'es') {
        message = 'Para obtener ayuda, comuníquese con nuestro equipo de servicio al cliente.\nTeléfono: 400-123-4567\nCorreo electrónico: support@baiju-nj.com';
    } else if (currentLanguage === 'fr') {
        message = 'Pour obtenir de l\'aide, veuillez contacter notre équipe de service client.\nTéléphone: 400-123-4567\nEmail: support@baiju-nj.com';
    } else if (currentLanguage === 'ja') {
        message = 'サポートが必要な場合は、カスタマーサービスチームまでお問い合わせください。\n電話: 400-123-4567\nメール: support@baiju-nj.com';
    } else if (currentLanguage === 'ar') {
        message = 'للحصول على المساعدة، يرجى الاتصال بفريق خدمة العملاء.\nهاتف: 400-123-4567\nالبريد الإلكتروني: support@baiju-nj.com';
    }
    alert(message);
}

// 提交反馈函数
export function submitFeedback() {
    const type = document.getElementById('feedback-type').value;
    const title = document.getElementById('feedback-title').value;
    const content = document.getElementById('feedback-content').value;
    const contact = document.getElementById('contact-info').value;
    const rating = document.querySelectorAll('.star.active').length;

    if (!title || !content) {
        alert(currentLanguage === 'zh-CN' ? '请填写标题和详细内容' : 'Please fill in title and content');
        return;
    }

    // 这里可以添加实际的提交逻辑（发送到服务器）
    console.log('提交反馈:', {type, title, content, contact, rating});

    // 显示成功消息
    alert(currentLanguage === 'zh-CN' ?
        '反馈提交成功！感谢您的宝贵意见。' :
        'Feedback submitted successfully! Thank you for your valuable feedback.');

    // 清空表单
    document.getElementById('feedback-title').value = '';
    document.getElementById('feedback-content').value = '';
    document.getElementById('contact-info').value = '';
    document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
    document.getElementById('rating-text').textContent = currentLanguage === 'zh-CN' ? '请选择评分' : 'Please select rating';
}



export {replaceTextIds, originalTexts, currentBaseGenreName, currentGenre};
