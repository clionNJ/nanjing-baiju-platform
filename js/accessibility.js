// 无障碍功能实现文件

// 全局变量
let isListening = false;
let recognition;
let highContrastMode = false;
let colorBlindMode = ''; // 存储当前色盲模式类型

// 初始化无障碍功能
document.addEventListener('DOMContentLoaded', function() {
    initAccessibilityFeatures();
});

// 初始化所有无障碍功能
function initAccessibilityFeatures() {
    initVoiceControl();
    initContrastControl();
    initCareMode();
    initVoiceIntroPrompt();
}

// 初始化语音控制功能
function initVoiceControl() {
    const voiceBtn = document.getElementById('voice-control-btn');
    const voiceStatus = document.getElementById('voice-status');
    
    // 检查浏览器是否支持语音识别
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // 创建语音识别对象
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // 设置语音识别参数
        recognition.lang = 'zh-CN'; // 设置为中文识别
        recognition.continuous = true; // 持续识别
        recognition.interimResults = true; // 获取中间结果
        
        // 语音识别事件监听
        recognition.onstart = function() {
            isListening = true;
            voiceStatus.style.display = 'block';
            voiceBtn.classList.add('listening');
            document.getElementById('voice-status-text').textContent = '正在聆听...';
        };
        
        recognition.onresult = function(event) {
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
            
            // 显示识别状态
            if (finalTranscript) {
                document.getElementById('voice-status-text').textContent = '识别结果: ' + finalTranscript;
                handleVoiceCommand(finalTranscript);
            } else if (interimTranscript) {
                document.getElementById('voice-status-text').textContent = '正在聆听: ' + interimTranscript;
            }
        };
        
        recognition.onerror = function(event) {
            console.error('语音识别错误:', event.error);
            voiceStatus.style.display = 'block';
            document.getElementById('voice-status-text').textContent = '识别错误: ' + event.error;
            setTimeout(() => {
                voiceStatus.style.display = 'none';
            }, 3000);
        };
        
        recognition.onend = function() {
            isListening = false;
            voiceStatus.style.display = 'none';
            voiceBtn.classList.remove('listening');
        };
        
        // 语音按钮点击事件
        voiceBtn.addEventListener('click', function() {
            if (isListening) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (e) {
                    console.error('语音识别启动失败:', e);
                    voiceStatus.style.display = 'block';
                    document.getElementById('voice-status-text').textContent = '语音识别启动失败';
                    setTimeout(() => {
                        voiceStatus.style.display = 'none';
                    }, 3000);
                }
            }
        });
    } else {
        // 不支持语音识别的提示
        voiceBtn.addEventListener('click', function() {
            alert('您的浏览器不支持语音识别功能，请使用Chrome浏览器以获得最佳体验。');
        });
    }
}

// 进入站点语音模式询问
let introRecognition = null;
function initVoiceIntroPrompt() {
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

    const closeModal = () => {
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
        speakText('已开启语音模式');
    };

    const decline = () => {
        closeModal();
        speakText('已关闭语音模式');
    };

    btnYes.addEventListener('click', acceptAndStart);
    btnNo.addEventListener('click', decline);

    // 若浏览器支持语音识别，开始短暂监听关键词
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        introRecognition = new SpeechRecognition();
        introRecognition.lang = 'zh-CN';
        introRecognition.continuous = false;
        introRecognition.interimResults = true;

        let decided = false;
        const decideFromText = (text) => {
            const t = text.toLowerCase();
            if (t.includes('需要') || t.includes('开启') || t.includes('打开') || t.includes('是')) {
                decided = true;
                acceptAndStart();
            } else if (t.includes('不需要') || t.includes('不用') || t.includes('否') || t.includes('不要')) {
                decided = true;
                decline();
            }
        };

        introRecognition.onresult = (event) => {
            let interim = '';
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const tx = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalText += tx;
                else interim += tx;
            }
            if (finalText) decideFromText(finalText);
            else if (interim) decideFromText(interim);
        };
        introRecognition.onerror = () => { /* 忽略错误，继续走超时兜底 */ };
        introRecognition.onend = () => { /* 等待超时或用户点击 */ };

        try { introRecognition.start(); } catch(e) {}

        // 8 秒无应答自动关闭
        setTimeout(() => {
            if (!decided) decline();
        }, 8000);
    } else {
        // 不支持语音：保留按钮选择，6秒后默认关闭
        setTimeout(() => {
            if (modal.style.display === 'block') decline();
        }, 6000);
    }
}

// 关怀模式（简洁语言）
function initCareMode() {
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

function applyCareMode(enable) {
    const root = document.documentElement; // <html>
    if (enable) {
        root.classList.add('care-mode');
        // 将带有 data-simple 的元素切换为简洁文本
        swapSimpleText(true);
    } else {
        // 先还原文本，再移除类
        swapSimpleText(false);
        root.classList.remove('care-mode');
    }
}

function swapSimpleText(useSimple) {
    const nodes = document.querySelectorAll('[data-simple]');
    nodes.forEach(node => {
        // 仅处理文本节点容器，避免覆盖复杂 HTML 结构
        // 如果包含子元素，则跳过（可按需扩展为 data-simple-html）
        if (node.children && node.children.length > 0) return;

        const simpleText = node.getAttribute('data-simple');
        if (simpleText == null) return;

        // 缓存原始文本
        if (!node.hasAttribute('data-original')) {
            node.setAttribute('data-original', node.textContent);
        }
        const original = node.getAttribute('data-original');

        node.textContent = useSimple ? simpleText : original;
    });
}

// 处理语音命令
function handleVoiceCommand(command) {
    command = command.toLowerCase().trim();
    
    // 定义语音命令映射
    const commands = {
        // 页面导航命令
        '首页': () => navigateToPage('language-page'),
        '功能': () => navigateToPage('feature-page'),
        '我要看白局': () => navigateToPage('feature-page'),
        '看白局': () => navigateToPage('feature-page'),
        '返回': () => goBack(),
        '主页': () => navigateToPage('language-page'),
        
        // 语言选择命令
        '中文': () => selectLanguageFromAccessibility('zh'),
        '英文': () => selectLanguageFromAccessibility('en'),
        '日文': () => selectLanguageFromAccessibility('ja'),
        '韩文': () => selectLanguageFromAccessibility('ko'),
        '法文': () => selectLanguageFromAccessibility('fr'),
        '德文': () => selectLanguageFromAccessibility('de'),
        
        // 功能选择命令
        '历史': () => selectFeature('history'),
        '特点': () => selectFeature('characteristics'),
        '演唱': () => selectFeature('performance'),
        '服饰': () => selectFeature('costume'),
        '传承': () => selectFeature('inheritance'),
        '互动': () => selectFeature('interaction'),
        
        // 南京白局特色命令
        '白局': () => selectFeature('performance'),
        '演唱白局': () => selectFeature('performance'),
        '白局历史': () => selectFeature('history'),
        '白局特点': () => selectFeature('characteristics'),

        // 反馈页快捷
        '反馈意见': () => openFeedback(),
        '我要反馈意见': () => openFeedback(),
        '意见与反馈': () => openFeedback(),
        
        // 控制命令
        '停止': () => stopAll(),
        '关闭': () => stopAll(),
        '退出': () => stopAll()
    };
    
    // 查找匹配的命令
    let matched = false;
    for (const [key, action] of Object.entries(commands)) {
        if (command.includes(key)) {
            action();
            matched = true;
            break;
        }
    }
    
    // 如果没有匹配的命令，提供语音反馈
    if (!matched) {
        speakText('抱歉，我没有理解您的命令: ' + command);
    }
}

// 打开意见反馈（feature6）
function openFeedback() {
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
function navigateToPage(pageId) {
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
function goBack() {
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
function selectLanguageFromAccessibility(langCode) {
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
function updateLanguageContent() {
    // 这里应该实现语言内容更新逻辑
    // 由于我们不知道具体的实现细节，这里只是一个占位符
    console.log('更新语言内容到:', window.currentLanguage);
}

// 获取语言名称
function getLanguageName(langCode) {
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
function selectFeature(featureId) {
    // 触发功能卡片点击事件
    const featureCard = document.querySelector(`.feature-card[data-feature="${featureId}"]`);
    if (featureCard) {
        featureCard.click();
        speakText(`已选择${getFeatureName(featureId)}功能`);
    }
}

// 获取功能名称
function getFeatureName(featureId) {
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
function stopAll() {
    if (recognition && isListening) {
        recognition.stop();
    }
    speakText('已停止语音识别');
}

// 文字转语音
function speakText(text) {
    // 检查浏览器是否支持语音合成
    if ('speechSynthesis' in window) {
        // 取消之前的语音播放
        window.speechSynthesis.cancel();
        
        // 创建语音合成对象
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN'; // 设置为中文
        utterance.rate = 1.0; // 语速
        utterance.pitch = 1.0; // 音调
        utterance.volume = 1.0; // 音量
        
        // 播放语音
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn('您的浏览器不支持语音合成功能');
    }
}

// 初始化对比度控制功能
function initContrastControl() {
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
function createContrastMenu() {
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
function toggleContrastMenu() {
    const menu = document.getElementById('contrast-menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// 应用对比度模式
function applyContrastMode(mode) {
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