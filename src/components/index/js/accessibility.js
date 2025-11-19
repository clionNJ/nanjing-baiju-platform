// 无障碍功能实现文件

// 全局变量
let isListening = false;
let recognition;
let highContrastMode = false;
let colorBlindMode = ''; // 存储当前色盲模式类型

// 语音播报防抖和去重机制
let lastSpokenText = '';
let lastSpokenTime = 0;
let speakDebounceTimer = null;
const SPEAK_DEBOUNCE_MS = 2000; // 2秒内不重复播报相同内容
const MIN_SPEAK_INTERVAL = 500; // 最小播报间隔500ms

// 语音播放状态跟踪（防止识别到自己播放的语音）
let isSpeaking = false;
let recognitionWasActive = false; // 记录在播放前识别是否处于活动状态

// 检测是否为移动设备
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window);
}

// 检查是否支持HTTPS（包括localhost和127.0.0.1）
export function isSecureContext() {
    return window.isSecureContext ||
           location.protocol === 'https:' ||
           location.hostname === 'localhost' ||
           location.hostname === '127.0.0.1' ||
           location.hostname === '0.0.0.0';
}

// 初始化无障碍功能
document.addEventListener('DOMContentLoaded', function() {
    initAccessibilityFeatures();
});

// 初始化所有无障碍功能
export function initAccessibilityFeatures() {
    initVoiceControl();
    initContrastControl();
    initCareMode();
    initVoiceIntroPrompt();
}

// 初始化语音控制功能
export function initVoiceControl() {
    const voiceBtn = document.getElementById('voice-control-btn');
    const voiceStatus = document.getElementById('voice-status');

    if (!voiceBtn || !voiceStatus) return;

    // 检查是否在安全环境下（HTTPS或localhost）
    if (!isSecureContext()) {
        console.warn('语音识别需要HTTPS环境或localhost');
        voiceBtn.addEventListener('click', function() {
            const isMobile = isMobileDevice();
            const msg = isMobile
                ? '语音识别需要在HTTPS环境下运行。\n请使用HTTPS访问此页面，或使用Chrome浏览器访问。'
                : '语音识别功能需要在HTTPS环境下运行，请切换到HTTPS页面。';
            alert(msg);
        });
        return;
    }

    // 请求麦克风权限（移动端兼容）
    export function requestMicrophonePermission() {
        return new Promise((resolve, reject) => {
            // 优先使用现代API
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then((stream) => {
                        // 立即关闭流，只用于权限检查
                        stream.getTracks().forEach(track => track.stop());
                        resolve(true);
                    })
                    .catch((err) => {
                        console.error('麦克风权限请求失败:', err);
                        reject(err);
                    });
            } else if (navigator.getUserMedia) {
                // 兼容旧版API
                navigator.getUserMedia({ audio: true },
                    (stream) => {
                        stream.getTracks().forEach(track => track.stop());
                        resolve(true);
                    },
                    (err) => {
                        console.error('麦克风权限请求失败:', err);
                        reject(err);
                    }
                );
            } else {
                reject(new Error('浏览器不支持麦克风权限请求'));
            }
        });
    }

    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceBtn.addEventListener('click', function() {
            const isMobile = isMobileDevice();
            const msg = isMobile
                ? '您的设备或浏览器不支持语音识别。\n请使用Chrome浏览器（Android/iOS）以获得最佳体验。'
                : '您的浏览器不支持语音识别功能，请使用Chrome浏览器以获得最佳体验。';
            alert(msg);
        });
        return;
    }

    // 创建语音识别对象
    recognition = new SpeechRecognition();

    // 设置语音识别参数（移动端优化）
    recognition.lang = 'zh-CN';
    recognition.continuous = true; // 持续识别
    recognition.interimResults = true; // 获取中间结果

    // 移动端特殊处理：降低连续识别频率，避免过度触发
    if (isMobileDevice()) {
        recognition.continuous = true;
        recognition.interimResults = false; // 移动端只处理最终结果，减少误触发
    }

    // 记录最后处理的命令，避免重复处理
    let lastProcessedCommand = '';
    let lastProcessedTime = 0;
    const COMMAND_DEBOUNCE_MS = 1500; // 1.5秒内不重复处理相同命令

    // 语音识别事件监听
    recognition.onstart = function() {
        isListening = true;
        voiceStatus.style.display = 'block';
        voiceBtn.classList.add('listening');
        const statusText = document.getElementById('voice-status-text');
        if (statusText) {
            statusText.textContent = '正在聆听...';
        }
    };

    recognition.onresult = function(event) {
        // 如果正在播放语音，忽略所有识别结果（防止识别到自己播放的语音）
        if (isSpeaking) {
            return;
        }

        let interimTranscript = '';
        let finalTranscript = '';

        // 处理识别结果
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        const statusText = document.getElementById('voice-status-text');

        // 显示识别状态
        if (finalTranscript) {
            const command = finalTranscript.trim().toLowerCase();
            const now = Date.now();

            // 防抖：避免短时间内重复处理相同命令
            if (command === lastProcessedCommand && (now - lastProcessedTime) < COMMAND_DEBOUNCE_MS) {
                if (statusText) {
                    statusText.textContent = '已处理，请稍候...';
                }
                return;
            }

            lastProcessedCommand = command;
            lastProcessedTime = now;

            if (statusText) {
                statusText.textContent = '识别结果: ' + finalTranscript;
            }
            handleVoiceCommand(finalTranscript);
        } else if (interimTranscript) {
            if (statusText) {
                statusText.textContent = '正在聆听: ' + interimTranscript;
            }
        }
    };

    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        const statusText = document.getElementById('voice-status-text');
        if (!statusText) return;

        voiceStatus.style.display = 'block';
        let errorMessage = '识别错误: ' + event.error;

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            errorMessage = '麦克风权限被拒绝，请在浏览器设置中启用麦克风权限。';
        } else if (event.error === 'no-speech') {
            // no-speech 是正常情况，不显示错误
            voiceStatus.style.display = 'none';
            return;
        } else if (event.error === 'audio-capture') {
            errorMessage = '无法访问麦克风，请确保麦克风正常工作。';
        } else if (event.error === 'network') {
            errorMessage = '网络错误，请检查网络连接。';
        } else if (event.error === 'aborted') {
            // 用户主动停止，不显示错误
            return;
        }

        statusText.textContent = errorMessage;
        setTimeout(() => {
            voiceStatus.style.display = 'none';
        }, 5000);
    };

    recognition.onend = function() {
        isListening = false;
        voiceStatus.style.display = 'none';
        voiceBtn.classList.remove('listening');

        // 如果正在播放语音，不要自动重启识别（会在播放完成后恢复）
        // 如果是因为错误结束，不自动重启
        // 只有在用户主动停止或正常结束时才考虑重启（如果需要持续监听）
        if (isSpeaking) {
            // 正在播放语音，不处理，等待播放完成后恢复
            return;
        }
    };

    // 语音按钮点击事件
    voiceBtn.addEventListener('click', function() {
        if (isListening) {
            recognition.stop();
        } else {
            // 先请求权限，再启动识别
            requestMicrophonePermission()
                .then(() => {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error('语音识别启动失败:', e);
                        const statusText = document.getElementById('voice-status-text');
                        if (statusText) {
                            voiceStatus.style.display = 'block';
                            statusText.textContent = '语音识别启动失败，请稍后重试。';
                            setTimeout(() => {
                                voiceStatus.style.display = 'none';
                            }, 3000);
                        }
                    }
                })
                .catch((err) => {
                    console.error('麦克风权限获取失败:', err);
                    const statusText = document.getElementById('voice-status-text');
                    if (statusText) {
                        voiceStatus.style.display = 'block';
                        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                            const isMobile = isMobileDevice();
                            statusText.textContent = isMobile
                                ? '请在浏览器设置中允许麦克风权限，然后刷新页面重试。'
                                : '麦克风权限被拒绝，请在浏览器设置中启用麦克风权限。';
                        } else {
                            statusText.textContent = '无法访问麦克风，请检查设备设置。';
                        }
                        setTimeout(() => {
                            voiceStatus.style.display = 'none';
                        }, 5000);
                    }
                });
        }
    });
}

// 进入站点语音模式询问
let introRecognition = null;
export function initVoiceIntroPrompt() {
    // 每个会话只询问一次
    if (sessionStorage.getItem('voiceIntroHandled') === 'true') return;

    const modal = document.getElementById('voice-intro-modal');
    const overlay = document.getElementById('overlay');
    const btnYes = document.getElementById('voice-intro-yes');
    const btnNo = document.getElementById('voice-intro-no');
    if (!modal || !overlay || !btnYes || !btnNo) return;

    // 打开弹窗
    overlay.classList.add('active');
    modal.style.display = 'block';

    // 语音播报提示（视障可感知）
    speakText('是否需要开启语音模式以便通过语音快速操作？您可以说，需要，或，不需要。');

    // 定时器引用，用于清理
    let reminderTimeout = null;
    let autoCloseTimeout = null;

    const closeModal = () => {
        // 清理定时器
        if (reminderTimeout) {
            clearTimeout(reminderTimeout);
            reminderTimeout = null;
        }
        if (autoCloseTimeout) {
            clearTimeout(autoCloseTimeout);
            autoCloseTimeout = null;
        }

        overlay.classList.remove('active');
        modal.style.display = 'none';
        if (introRecognition) {
            try { introRecognition.stop(); } catch(e) {}
            introRecognition = null;
        }
        sessionStorage.setItem('voiceIntroHandled', 'true');
    };

    const acceptAndStart = () => {
        closeModal();
        // 启动主语音识别
        const voiceBtn = document.getElementById('voice-control-btn');
        if (voiceBtn) {
            voiceBtn.click();
        } else if (recognition) {
            try { recognition.start(); } catch(e) {}
        }
        speakText('已开启语音模式。您可以说：我要看白局、我要反馈意见、返回语言等。');
    };

    const decline = () => {
        closeModal();
        speakText('已关闭语音模式');
    };

    btnYes.addEventListener('click', acceptAndStart);
    btnNo.addEventListener('click', decline);

    // 若浏览器支持语音识别，开始短暂监听关键词
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && isSecureContext()) {
        introRecognition = new SpeechRecognition();
        introRecognition.lang = 'zh-CN';
        introRecognition.continuous = false;
        // 移动端只处理最终结果
        introRecognition.interimResults = !isMobileDevice();

        let decided = false;
        let lastProcessedIntroText = '';
        let lastProcessedIntroTime = 0;
        const INTRO_COMMAND_DEBOUNCE_MS = 1000; // 1秒内不重复处理

        const decideFromText = (text) => {
            if (decided) return; // 已决定，不再处理

            const t = (text || '').toLowerCase().trim();
            const now = Date.now();

            // 防抖：避免重复处理
            if (t === lastProcessedIntroText && (now - lastProcessedIntroTime) < INTRO_COMMAND_DEBOUNCE_MS) {
                return;
            }
            lastProcessedIntroText = t;
            lastProcessedIntroTime = now;

            // 更丰富的肯定/否定表达
            const yesList = ['需要','开启','打开','是','好','好的','行','可以','要','yes','ok','okay','sure'];
            const noList  = ['不需要','不用','否','不要','先不要','不用了','取消','no','not','later'];
            const hit = (arr) => arr.some(k => t.includes(k));

            // 直接导航意图（同时视为同意开启）
            const goBaiju = /(我要看白局|看白局|进入白局|白局)/.test(t);
            const goFeedback = /(我要反馈|反馈意见|意见与反馈|feedback)/.test(t);

            if (goBaiju) {
                decided = true;
                acceptAndStart();
                // 启动后导航到功能页
                setTimeout(() => {
                    try { navigateToPage('feature-page'); } catch(e) {}
                    speakText('已为您打开白局功能页面。');
                }, 500);
                return;
            }
            if (goFeedback) {
                decided = true;
                acceptAndStart();
                setTimeout(() => {
                    try { openFeedback(); } catch(e) {
                        try { navigateToPage('feature-page'); } catch(_) {}
                    }
                }, 500);
                return;
            }

            if (hit(yesList)) {
                decided = true;
                acceptAndStart();
                return;
            }
            if (hit(noList)) {
                decided = true;
                decline();
                return;
            }
        };

        introRecognition.onresult = (event) => {
            // 如果正在播放语音，忽略所有识别结果（防止识别到自己播放的语音）
            if (isSpeaking) {
                return;
            }

            let interim = '';
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const tx = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalText += tx;
                else interim += tx;
            }
            // 优先处理最终结果
            if (finalText) {
                decideFromText(finalText);
            } else if (interim && !isMobileDevice()) {
                // 桌面端也处理中间结果
                decideFromText(interim);
            }
        };

        introRecognition.onerror = (event) => {
            // 忽略 no-speech 和 aborted 错误（正常情况）
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.log('进站语音询问识别错误（已忽略）:', event.error);
            }
        };

        introRecognition.onend = () => {
            // 如果未决定且仍在显示，可以尝试重启（但这里我们依赖超时机制）
        };

        try {
            introRecognition.start();
        } catch(e) {
            console.log('进站语音询问启动失败（已忽略）:', e);
        }

        // 3 秒后若仍未决定，进行一次重复播报提示（只播一次）
        reminderTimeout = setTimeout(() => {
            if (!decided && modal.style.display === 'block') {
                speakText('请说，需要，或说，不需要。也可以直接说：我要看白局，或者我要反馈意见。');
            }
        }, 3000);

        // 8 秒无应答自动关闭
        autoCloseTimeout = setTimeout(() => {
            if (!decided) {
                decline();
            }
        }, 8000);
    } else {
        // 不支持语音或非安全环境：保留按钮选择，6秒后默认关闭
        autoCloseTimeout = setTimeout(() => {
            if (modal.style.display === 'block') decline();
        }, 6000);
    }
}

// 关怀模式（简洁语言）
export function initCareMode() {
    const careBtn = document.getElementById('care-mode-btn');
    if (!careBtn) return;

    // 恢复持久化状态
    const saved = localStorage.getItem('careModeEnabled');
    const enabled = saved === 'true';
    applyCareMode(enabled);

    careBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const nowEnabled = !document.documentElement.classList.contains('care-mode');
        applyCareMode(nowEnabled);
        localStorage.setItem('careModeEnabled', nowEnabled ? 'true' : 'false');
        speakText(nowEnabled ? '已开启关怀模式' : '已关闭关怀模式');
    });
}

export function applyCareMode(enable) {
    const root = document.documentElement; // <html>
    if (enable) {
        root.classList.add('care-mode');
        // 将带有 data-simple 的元素切换为简洁文本
        swapSimpleText(true);
        ensureCareModeObserver();
    } else {
        // 先还原文本，再移除类
        swapSimpleText(false);
        root.classList.remove('care-mode');
        disconnectCareModeObserver();
    }
}

let careModeObserver = null;
let careModeDebounceTimer = null;
export function ensureCareModeObserver() {
    if (careModeObserver) return;
    try {
        careModeObserver = new MutationObserver(() => {
            if (careModeDebounceTimer) clearTimeout(careModeDebounceTimer);
            careModeDebounceTimer = setTimeout(() => {
                if (document.documentElement.classList.contains('care-mode')) {
                    swapSimpleText(true);
                }
            }, 60);
        });
        careModeObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-simple','data-simple-html','data-simple-title','data-simple-aria-label','data-simple-placeholder']
        });
    } catch (e) {
        // 忽略观察器错误（如 document.body 未就绪）
    }
}
export function disconnectCareModeObserver() {
    if (careModeObserver) {
        try { careModeObserver.disconnect(); } catch(e) {}
        careModeObserver = null;
    }
    if (careModeDebounceTimer) {
        clearTimeout(careModeDebounceTimer);
        careModeDebounceTimer = null;
    }
}

export function swapSimpleText(useSimple) {
    // 统一处理多类型简洁内容：文本、HTML 和常见属性
    const selector = [
        '[data-simple]',
        '[data-simple-html]',
        '[data-simple-title]',
        '[data-simple-aria-label]',
        '[data-simple-placeholder]'
    ].join(',');

    const nodes = document.querySelectorAll(selector);
    nodes.forEach(node => {
        // 1) 优先处理 data-simple-html：允许替换富文本（明确标注才会替换）
        const simpleHtml = node.getAttribute('data-simple-html');
        if (simpleHtml != null) {
            if (!node.hasAttribute('data-original-html')) {
                node.setAttribute('data-original-html', node.innerHTML);
            }
            const originalHtml = node.getAttribute('data-original-html') || '';
            if (useSimple) node.innerHTML = simpleHtml;
            else node.innerHTML = originalHtml;
        }

        // 2) 处理 data-simple 纯文本：
        //    - 无子元素：直接替换 textContent
        //    - 有子元素：为了不破坏结构，仅在关怀模式下提供 aria-label/title 的简洁描述
        const simpleText = node.getAttribute('data-simple');
        if (simpleText != null) {
            const hasChildren = !!(node.children && node.children.length > 0);

            if (!hasChildren) {
                if (!node.hasAttribute('data-original')) {
                    node.setAttribute('data-original', node.textContent);
                }
                const original = node.getAttribute('data-original') ?? '';
                node.textContent = useSimple ? simpleText : original;
            } else {
                // 缓存并覆盖 aria-label / title，尽量不改动原有可视结构
                if (!node.hasAttribute('data-original-aria-label') && node.hasAttribute('aria-label')) {
                    node.setAttribute('data-original-aria-label', node.getAttribute('aria-label') || '');
                }
                if (!node.hasAttribute('data-original-title') && node.hasAttribute('title')) {
                    node.setAttribute('data-original-title', node.getAttribute('title') || '');
                }
                if (useSimple) {
                    // 仅在缺省时补充，避免覆盖作者显式指定的 data-simple-aria-label / data-simple-title
                    if (!node.hasAttribute('data-simple-aria-label') && !node.hasAttribute('aria-label')) {
                        node.setAttribute('aria-label', simpleText);
                    }
                    if (!node.hasAttribute('data-simple-title') && !node.hasAttribute('title')) {
                        node.setAttribute('title', simpleText);
                    }
                } else {
                    // 还原
                    if (node.hasAttribute('data-original-aria-label')) {
                        node.setAttribute('aria-label', node.getAttribute('data-original-aria-label') || '');
                        node.removeAttribute('data-original-aria-label');
                    } else if (!node.hasAttribute('data-simple-aria-label')) {
                        node.removeAttribute('aria-label');
                    }
                    if (node.hasAttribute('data-original-title')) {
                        node.setAttribute('title', node.getAttribute('data-original-title') || '');
                        node.removeAttribute('data-original-title');
                    } else if (!node.hasAttribute('data-simple-title')) {
                        node.removeAttribute('title');
                    }
                }
            }
        }

        // 3) 处理常见属性型简洁内容
        const attrMappings = [
            ['data-simple-title', 'title', 'data-original-title-only'],
            ['data-simple-aria-label', 'aria-label', 'data-original-aria-label-only'],
            ['data-simple-placeholder', 'placeholder', 'data-original-placeholder-only']
        ];
        attrMappings.forEach(([dataAttr, realAttr, backupAttr]) => {
            const simpleVal = node.getAttribute(dataAttr);
            if (simpleVal == null) return;

            if (!node.hasAttribute(backupAttr)) {
                node.setAttribute(backupAttr, node.getAttribute(realAttr) || '');
            }
            const originalVal = node.getAttribute(backupAttr) || '';

            if (useSimple) node.setAttribute(realAttr, simpleVal);
            else {
                if (originalVal) node.setAttribute(realAttr, originalVal);
                else node.removeAttribute(realAttr);
                node.removeAttribute(backupAttr);
            }
        });
    });
}

// 处理语音命令
let unrecognizedCommandCount = 0; // 记录连续未识别命令次数
let lastUnrecognizedTime = 0;
const UNRECOGNIZED_DEBOUNCE_MS = 3000; // 3秒内不重复播报未识别提示

export function handleVoiceCommand(command) {
    command = command.toLowerCase().trim();

    // 定义语音命令映射（按优先级排序，更具体的命令在前）
    const commands = [
        // 页面导航命令
        { key: '我要看白局', action: () => navigateToPage('feature-page') },
        { key: '看白局', action: () => navigateToPage('feature-page') },
        { key: '我要反馈意见', action: () => openFeedback() },
        { key: '反馈意见', action: () => openFeedback() },
        { key: '意见与反馈', action: () => openFeedback() },
        { key: '首页', action: () => navigateToPage('language-page') },
        { key: '功能', action: () => navigateToPage('feature-page') },
        { key: '返回', action: () => goBack() },
        { key: '主页', action: () => navigateToPage('language-page') },

        // 语言选择命令
        { key: '中文', action: () => selectLanguageFromAccessibility('zh') },
        { key: '英文', action: () => selectLanguageFromAccessibility('en') },
        { key: '日文', action: () => selectLanguageFromAccessibility('ja') },
        { key: '韩文', action: () => selectLanguageFromAccessibility('ko') },
        { key: '法文', action: () => selectLanguageFromAccessibility('fr') },
        { key: '德文', action: () => selectLanguageFromAccessibility('de') },

        // 南京白局特色命令
        { key: '演唱白局', action: () => selectFeature('performance') },
        { key: '白局历史', action: () => selectFeature('history') },
        { key: '白局特点', action: () => selectFeature('characteristics') },
        { key: '白局', action: () => selectFeature('performance') },

        // 功能选择命令
        { key: '历史', action: () => selectFeature('history') },
        { key: '特点', action: () => selectFeature('characteristics') },
        { key: '演唱', action: () => selectFeature('performance') },
        { key: '服饰', action: () => selectFeature('costume') },
        { key: '传承', action: () => selectFeature('inheritance') },
        { key: '互动', action: () => selectFeature('interaction') },

        // 控制命令
        { key: '停止', action: () => stopAll() },
        { key: '关闭', action: () => stopAll() },
        { key: '退出', action: () => stopAll() }
    ];

    // 查找匹配的命令
    let matched = false;
    for (const cmd of commands) {
        if (command.includes(cmd.key)) {
            cmd.action();
            matched = true;
            unrecognizedCommandCount = 0; // 重置未识别计数
            break;
        }
    }

    // 如果没有匹配的命令，智能处理
    if (!matched) {
        const now = Date.now();

        // 防抖：避免短时间内重复播报
        if (now - lastUnrecognizedTime < UNRECOGNIZED_DEBOUNCE_MS) {
            unrecognizedCommandCount++;
            return; // 静默忽略，不播报
        }

        lastUnrecognizedTime = now;
        unrecognizedCommandCount++;

        // 根据连续未识别次数，给出不同的提示
        let feedbackText = '';
        if (unrecognizedCommandCount === 1) {
            // 第一次未识别，给出友好提示
            feedbackText = '抱歉，我没有理解。您可以试试说：我要看白局、反馈意见、返回等。';
        } else if (unrecognizedCommandCount <= 3) {
            // 2-3次未识别，简短提示
            feedbackText = '未识别。试试说：看白局、反馈、返回。';
        } else {
            // 超过3次，静默处理，避免过度打扰
            // 只在控制台记录，不播报
            console.log('连续未识别命令，已静默处理:', command);
            return;
        }

        // 使用防抖播报
        speakTextDebounced(feedbackText);
    }
}

// 打开意见反馈（feature6）
export function openFeedback() {
    navigateToPage('feature-page');
    if (typeof window.showFeatureDetail === 'function') {
        window.showFeatureDetail('feature6');
    } else {
        // 兜底：滚动到卡片
        const card = document.querySelector('.feature-card [id="feature6-title"]')?.closest('.feature-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    speakText('已进入意见与反馈');
}

// 页面导航
export function navigateToPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // 显示指定页面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        speakText(`已切换到${pageId === 'language-page' ? '语言选择' : '功能'}页面`);
    }
}

// 返回上一页
export function goBack() {
    const activePage = document.querySelector('.page.active');
    if (activePage && activePage.id === 'feature-page') {
        navigateToPage('language-page');
        speakText('已返回语言选择页面');
    } else if (activePage && activePage.id === 'feature-detail') {
        document.getElementById('feature-detail').style.display = 'none';
        document.getElementById('feature-page').classList.add('active');
        speakText('已返回功能页面');
    }
}

// 选择语言
// 添加一个标志来防止递归调用
let isSelectingLanguage = false;
export function selectLanguageFromAccessibility(langCode) {
    console.log('无障碍功能调用语言选择:', langCode);

    // 添加防递归调用保护
    if (isSelectingLanguage) {
        console.log('跳过递归调用');
        return;
    }

    try {
        isSelectingLanguage = true;

        // 如果全局selectLanguage函数存在，则调用它
        if (typeof window.selectLanguage === 'function') {
            console.log('调用全局selectLanguage函数');
            window.selectLanguage(langCode);
            speakText(`已选择${getLanguageName(langCode)}语言`);
        } else {
            console.log('全局selectLanguage函数不可用');
            // 如果主脚本中的函数不可用，直接修改语言
            window.currentLanguage = langCode;
            updateLanguageContent();
            speakText(`已选择${getLanguageName(langCode)}语言`);
        }
    } finally {
        isSelectingLanguage = false;
    }
}



// 更新语言内容
export function updateLanguageContent() {
    // 这里应该实现语言内容更新逻辑
    // 由于我们不知道具体的实现细节，这里只是一个占位符
    console.log('更新语言内容到:', window.currentLanguage);
}

// 获取语言名称
export function getLanguageName(langCode) {
    const languages = {
        'zh': '中文',
        'en': '英文',
        'ja': '日文',
        'ko': '韩文',
        'fr': '法文',
        'de': '德文'
    };
    return languages[langCode] || langCode;
}

// 选择功能
export function selectFeature(featureId) {
    // 触发功能卡片点击事件
    const featureCard = document.querySelector(`.feature-card[data-feature="${featureId}"]`);
    if (featureCard) {
        featureCard.click();
        speakText(`已选择${getFeatureName(featureId)}功能`);
    }
}

// 获取功能名称
export function getFeatureName(featureId) {
    const features = {
        'history': '历史渊源',
        'characteristics': '艺术特点',
        'performance': '虚拟传承人演唱展示',
        'costume': '服饰道具',
        'inheritance': '传承发展',
        'interaction': '互动体验'
    };
    return features[featureId] || featureId;
}

// 停止所有操作
export function stopAll() {
    if (recognition && isListening) {
        recognition.stop();
    }
    speakText('已停止语音识别');
}

// 文字转语音（带防抖和去重）
export function speakText(text, force = false) {
    if (!text || typeof text !== 'string') return;

    // 检查浏览器是否支持语音合成
    if (!('speechSynthesis' in window)) {
        console.warn('您的浏览器不支持语音合成功能');
        return;
    }

    const now = Date.now();

    // 去重：相同内容在短时间内不重复播报
    if (!force) {
        if (text === lastSpokenText && (now - lastSpokenTime) < SPEAK_DEBOUNCE_MS) {
            return; // 静默忽略重复内容
        }

        // 最小间隔检查
        if ((now - lastSpokenTime) < MIN_SPEAK_INTERVAL) {
            // 延迟播报
            if (speakDebounceTimer) {
                clearTimeout(speakDebounceTimer);
            }
            speakDebounceTimer = setTimeout(() => {
                speakText(text, true);
            }, MIN_SPEAK_INTERVAL - (now - lastSpokenTime));
            return;
        }
    }

    // 更新记录
    lastSpokenText = text;
    lastSpokenTime = now;

    // 取消之前的语音播放
    window.speechSynthesis.cancel();

    // 在播放语音前，暂停语音识别（防止识别到自己播放的语音）
    if (recognition && isListening) {
        try {
            recognitionWasActive = true;
            recognition.stop();
        } catch (e) {
            console.log('暂停语音识别时出错（已忽略）:', e);
        }
    } else {
        recognitionWasActive = false;
    }

    // 标记开始播放
    isSpeaking = true;

    // 创建语音合成对象
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; // 设置为中文
    utterance.rate = 1.0; // 语速
    utterance.pitch = 1.0; // 音调
    utterance.volume = 1.0; // 音量

    // 播放完成后的清理
    utterance.onend = function() {
        // 标记播放结束
        isSpeaking = false;

        // 如果之前识别是活动的，恢复语音识别
        if (recognitionWasActive && recognition) {
            // 延迟一小段时间再恢复，确保语音完全停止
            setTimeout(() => {
                try {
                    if (!isListening) {
                        recognition.start();
                    }
                } catch (e) {
                    // 如果启动失败，可能是已经在运行，忽略错误
                    console.log('恢复语音识别时出错（已忽略）:', e);
                }
            }, 300); // 300ms延迟，确保语音完全停止
        }
    };

    utterance.onerror = function(event) {
        console.error('语音播报错误:', event.error);
        // 即使出错也要恢复状态
        isSpeaking = false;
        if (recognitionWasActive && recognition) {
            setTimeout(() => {
                try {
                    if (!isListening) {
                        recognition.start();
                    }
                } catch (e) {
                    console.log('恢复语音识别时出错（已忽略）:', e);
                }
            }, 300);
        }
    };

    // 播放语音
    window.speechSynthesis.speak(utterance);
}

// 防抖版本的语音播报（用于非关键提示）
export function speakTextDebounced(text) {
    if (speakDebounceTimer) {
        clearTimeout(speakDebounceTimer);
    }
    speakDebounceTimer = setTimeout(() => {
        speakText(text);
    }, 300); // 300ms防抖
}

// 初始化对比度控制功能
export function initContrastControl() {
    const contrastBtn = document.getElementById('contrast-control-btn');

    // 创建对比度模式选择菜单
    createContrastMenu();

    contrastBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleContrastMenu();
    });

    // 点击页面其他地方关闭菜单
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('contrast-menu');
        if (menu && menu.style.display === 'block' && !contrastBtn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
}

// 创建对比度模式选择菜单
export function createContrastMenu() {
    const menu = document.createElement('div');
    menu.id = 'contrast-menu';
    menu.className = 'contrast-menu';
    menu.innerHTML = `
        <div class="menu-item" data-mode="normal">标准模式</div>
        <div class="menu-item" data-mode="high-contrast">高对比度模式</div>
        <div class="menu-item" data-mode="protanopia">红绿色盲模式(第一种)</div>
        <div class="menu-item" data-mode="deuteranopia">红绿色盲模式(第二种)</div>
        <div class="menu-item" data-mode="tritanopia">蓝黄色盲模式</div>
    `;

    document.body.appendChild(menu);

    // 为菜单项添加点击事件
    menu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const mode = this.getAttribute('data-mode');
            applyContrastMode(mode);
            menu.style.display = 'none';
        });
    });
}

// 切换对比度菜单显示状态
export function toggleContrastMenu() {
    const menu = document.getElementById('contrast-menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// 应用对比度模式
export function applyContrastMode(mode) {
    // 移除所有对比度模式类
    document.body.classList.remove('high-contrast', 'colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');

    // 根据选择的模式应用相应的类
    switch(mode) {
        case 'high-contrast':
            document.body.classList.add('high-contrast');
            speakText('已开启高对比度模式');
            break;
        case 'protanopia':
            document.body.classList.add('colorblind-protanopia');
            speakText('已开启红绿色盲模式(第一种)');
            break;
        case 'deuteranopia':
            document.body.classList.add('colorblind-deuteranopia');
            speakText('已开启红绿色盲模式(第二种)');
            break;
        case 'tritanopia':
            document.body.classList.add('colorblind-tritanopia');
            speakText('已开启蓝黄色盲模式');
            break;
        default:
            speakText('已恢复标准模式');
            break;
    }

    // 更新当前模式
    if (mode === 'high-contrast') {
        highContrastMode = true;
        colorBlindMode = '';
    } else if (mode.startsWith('colorblind')) {
        highContrastMode = false;
        colorBlindMode = mode;
    } else {
        highContrastMode = false;
        colorBlindMode = '';
    }
}
