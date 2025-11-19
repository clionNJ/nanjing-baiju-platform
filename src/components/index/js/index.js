
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
    return { message: finalMessage, langCode };
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        document.getElementById('f2-title').textContent = f2.title;
        document.getElementById('f2-desc').textContent = f2.desc;
        document.getElementById('f2-choose').textContent = f2.choose;
        document.getElementById('f2-lyrics-title').textContent = f2.lyricsTitle;
        document.getElementById('f2-btn-song1').textContent = f2.song1;
        document.getElementById('f2-btn-song2').textContent = f2.song2;
        document.getElementById('f2-btn-song3').textContent = f2.song3;
        document.getElementById('label-pitch').textContent = f2.pitch;
        document.getElementById('label-rhythm').textContent = f2.rhythm;
        document.getElementById('label-pronunciation').textContent = f2.pronunciation;
        document.getElementById('start-singing').textContent = f2.start;
        // 初始化歌词为 song1
        setTrainingLyrics('song1');
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
export function selectGenre(genre) {
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
    setTrainingLyrics(songId);
}

export function setTrainingLyrics(songId) {
    const f2 = languageTexts[currentLanguage].f2;
    const key = songId;
    const lines = (f2 && f2.sampleLyrics && f2.sampleLyrics[key]) ? f2.sampleLyrics[key] : [];
    const lyrics = document.getElementById('lyrics-display');
    if (lines.length) {
        lyrics.innerHTML = lines.map(line => `<div class="lyric-line">${line}</div>`).join('');
    } else {
        lyrics.innerHTML = `<div class="lyric-line">...</div>`;
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
        star.addEventListener('mouseover', function() {
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

    document.querySelector('.rating-stars').addEventListener('mouseout', function() {
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
        star.addEventListener('click', function() {
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
    console.log('提交反馈:', { type, title, content, contact, rating });

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

