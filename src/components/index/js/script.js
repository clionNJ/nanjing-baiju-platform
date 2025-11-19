// 语言文本映射
const languageTexts = {
    'zh-CN': {
        featureTitle: '功能界面',
        featureDescription: '欢迎使用我们的服务，请选择您需要的功能',
        feature1Title: '数据分析',
        feature1Desc: '查看和分析您的数据，获取有价值的见解',
        feature2Title: '工具设置',
        feature2Desc: '自定义您的工具和偏好设置',
        feature3Title: '文档管理',
        feature3Desc: '创建、编辑和管理您的文档',
        feature4Title: '团队协作',
        feature4Desc: '与团队成员协作完成项目',
        backBtn: '返回语言选择',
        helpBtn: '获取帮助'
    },
    'en': {
        featureTitle: 'Feature Dashboard',
        featureDescription: 'Welcome to our service, please select the feature you need',
        feature1Title: 'Data Analysis',
        feature1Desc: 'View and analyze your data to gain valuable insights',
        feature2Title: 'Tool Settings',
        feature2Desc: 'Customize your tools and preferences',
        feature3Title: 'Document Management',
        feature3Desc: 'Create, edit and manage your documents',
        feature4Title: 'Team Collaboration',
        feature4Desc: 'Collaborate with team members on projects',
        backBtn: 'Back to Language Selection',
        helpBtn: 'Get Help'
    },
    'es': {
        featureTitle: 'Panel de Funciones',
        featureDescription: 'Bienvenido a nuestro servicio, seleccione la función que necesita',
        feature1Title: 'Análisis de Datos',
        feature1Desc: 'Vea y analice sus datos para obtener información valiosa',
        feature2Title: 'Configuración de Herramientas',
        feature2Desc: 'Personalice sus herramientas y preferencias',
        feature3Title: 'Gestión de Documentos',
        feature3Desc: 'Cree, edite y gestione sus documentos',
        feature4Title: 'Colaboración en Equipo',
        feature4Desc: 'Colabore con miembros del equipo en proyectos',
        backBtn: 'Volver a la Selección de Idioma',
        helpBtn: 'Obtener Ayuda'
    },
    'fr': {
        featureTitle: 'Tableau de Bord des Fonctionnalités',
        featureDescription: 'Bienvenue dans notre service, veuillez sélectionner la fonctionnalité dont vous avez besoin',
        feature1Title: 'Analyse de Données',
        feature1Desc: 'Visualisez et analysez vos données pour obtenir des informations précieuses',
        feature2Title: 'Paramètres des Outils',
        feature2Desc: 'Personnalisez vos outils et préférences',
        feature3Title: 'Gestion de Documents',
        feature3Desc: 'Créez, modifiez et gérez vos documents',
        feature4Title: 'Collaboration d\'Équipe',
        feature4Desc: 'Collaborez avec les membres de l\'équipe sur des projets',
        backBtn: 'Retour à la Sélection de la Langue',
        helpBtn: 'Obtenir de l\'Aide'
    },
    'ja': {
        featureTitle: '機能ダッシュボード',
        featureDescription: '当サービスへようこそ、必要な機能を選択してください',
        feature1Title: 'データ分析',
        feature1Desc: 'データを表示・分析して価値ある洞察を得る',
        feature2Title: 'ツール設定',
        feature2Desc: 'ツールと設定をカスタマイズ',
        feature3Title: 'ドキュメント管理',
        feature3Desc: 'ドキュメントの作成、編集、管理',
        feature4Title: 'チームコラボレーション',
        feature4Desc: 'チームメンバーとプロジェクトで協力',
        backBtn: '言語選択に戻る',
        helpBtn: 'ヘルプを取得'
    },
    'de': {
        featureTitle: 'Funktionsübersicht',
        featureDescription: 'Willkommen bei unserem Service, bitte wählen Sie die gewünschte Funktion aus',
        feature1Title: 'Datenanalyse',
        feature1Desc: 'Betrachten und analysieren Sie Ihre Daten, um wertvolle Erkenntnisse zu gewinnen',
        feature2Title: 'Werkzeugeinstellungen',
        feature2Desc: 'Passen Sie Ihre Werkzeuge und Einstellungen an',
        feature3Title: 'Dokumentenverwaltung',
        feature3Desc: 'Erstellen, bearbeiten und verwalten Sie Ihre Dokumente',
        feature4Title: 'Teamzusammenarbeit',
        feature4Desc: 'Arbeiten Sie mit Teammitgliedern an Projekten zusammen',
        backBtn: 'Zurück zur Sprachauswahl',
        helpBtn: 'Hilfe erhalten'
    }
};

// 当前选择的语言
let currentLanguage = 'zh-CN';

// 选择语言函数
export function selectLanguage(lang) {
    currentLanguage = lang;

    // 更新功能页面的文本
    document.getElementById('feature-title').textContent = languageTexts[lang].featureTitle;
    document.getElementById('feature-description').textContent = languageTexts[lang].featureDescription;
    document.getElementById('feature1-title').textContent = languageTexts[lang].feature1Title;
    document.getElementById('feature1-desc').textContent = languageTexts[lang].feature1Desc;
    document.getElementById('feature2-title').textContent = languageTexts[lang].feature2Title;
    document.getElementById('feature2-desc').textContent = languageTexts[lang].feature2Desc;
    document.getElementById('feature3-title').textContent = languageTexts[lang].feature3Title;
    document.getElementById('feature3-desc').textContent = languageTexts[lang].feature3Desc;
    document.getElementById('feature4-title').textContent = languageTexts[lang].feature4Title;
    document.getElementById('feature4-desc').textContent = languageTexts[lang].feature4Desc;
    document.getElementById('back-btn').textContent = languageTexts[lang].backBtn;
    document.getElementById('help-btn').textContent = languageTexts[lang].helpBtn;

    // 切换到功能页面
    document.getElementById('language-page').classList.remove('active');
    document.getElementById('feature-page').classList.add('active');
}

// 返回语言选择页面
export function goBackToLanguage() {
    document.getElementById('feature-page').classList.remove('active');
    document.getElementById('language-page').classList.add('active');
}

// 帮助按钮点击事件
document.getElementById('help-btn').addEventListener('click', function() {
    alert(currentLanguage === 'zh-CN' ?
        '帮助功能正在开发中...' :
        'Help feature is under development...');
});
// 虚拟人物表演功能
let isPerforming = false;
let currentPerformance = null;

export function playPerformance(songId) {
    if (isPerforming) {
        stopPerformance();
    }

    isPerforming = true;
    currentPerformance = songId;

    // 开始嘴巴动画
    const mouth = document.getElementById('mouth');
    mouth.classList.add('speaking');

    // 根据选择的歌曲播放不同的表演
    switch(songId) {
        case 'song1':
            simulatePerformance('秦淮灯会', 10000); // 10秒表演
            break;
        case 'song2':
            simulatePerformance('金陵四季', 8000); // 8秒表演
            break;
    }
}

export function stopPerformance() {
    isPerforming = false;
    currentPerformance = null;

    // 停止嘴巴动画
    const mouth = document.getElementById('mouth');
    mouth.classList.remove('speaking');

    // 清空表演文本
    const performanceText = document.getElementById('performance-text');
    performanceText.textContent = '';

    console.log('表演已停止');
}

export function simulatePerformance(songName, duration) {
    console.log(`开始表演: ${songName}`);

    // 更新表演状态
    const performanceText = document.getElementById('performance-text');
    performanceText.textContent = `正在表演: ${songName}...`;

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
            performanceText.textContent = '表演结束';

            // 3秒后清空文本
            setTimeout(() => {
                performanceText.textContent = '';
            }, 3000);
        }
    }, duration);
}

export function getLyrics(songName) {
    const lyrics = {
        '秦淮灯会': [
            '🎵 秦淮河畔灯火明，',
            '🎵 游人如织喜盈盈。',
            '🎵 白局一曲传千古，',
            '🎵 文化传承永不停。'
        ],
        '金陵四季': [
            '🎵 春到金陵花满枝，',
            '🎵 夏日荷塘映日辉，',
            '🎵 秋风送爽桂花香，',
            '🎵 冬雪纷飞兆丰年。'
        ]
    };

    return lyrics[songName] || ['正在加载歌词...'];
}

// 更新原有的selectSong函数
export function selectSong(songId) {
    console.log('选择唱段:', songId);
    // 可以选择唱段但不立即播放
    const performanceText = document.getElementById('performance-text');
    performanceText.textContent = `已选择: ${getSongName(songId)}，点击播放按钮开始表演`;
}

export function getSongName(songId) {
    const songNames = {
        'song1': '《秦淮灯会》',
        'song2': '《金陵四季》',
        'song3': '《南京美食》'
    };
    return songNames[songId] || '未知唱段';
}
