<template>
  <div class="my-component">
    <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          onerror="this.onerror=null;this.href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'">
    <h2>这是我的第一个组件！</h2>
    <p>来自父组件的消息：{{ msg }}</p>
    <p>当前计数：{{ count }}</p>
    <button @click="increment">点我加一</button>
    <!-- 遮罩层 -->
    <div class="overlay" id="overlay"></div>

    <!-- 语音模式询问弹窗 -->
    <div id="voice-intro-modal" class="voice-intro-modal" role="dialog" aria-modal="true"
         aria-labelledby="voice-intro-title" aria-describedby="voice-intro-desc">
      <h3 id="voice-intro-title" data-simple="开启语音模式？">是否需要开启语音模式以便通过语音快速操作？</h3>
      <p id="voice-intro-desc" data-simple="你可以说“需要”或“不要”。">
        你可以说“需要/开启/是”进入语音模式，或说“不需要/不用/否”关闭。若保持沉默，数秒后自动关闭。</p>
      <p class="voice-intro-hint" data-simple="也可点按钮">也可直接点击下面的按钮：</p>
      <div class="voice-intro-actions">
        <button id="voice-intro-yes" class="btn" data-simple="需要">需要语音模式</button>
        <button id="voice-intro-no" class="btn back-btn" data-simple="不需要">暂不需要</button>
      </div>
    </div>

    <div class="container">
      <!-- 助残功能控制按钮 -->
      <div class="accessibility-controls">
        <button id="voice-control-btn" class="accessibility-btn" title="语音控制">
          <i class="fas fa-microphone"></i>
        </button>
        <button id="contrast-control-btn" class="accessibility-btn" title="对比度调节">
          <i class="fas fa-adjust"></i>
        </button>
        <button id="care-mode-btn" class="accessibility-btn" title="关怀模式（简洁语言）">
          <i class="fas fa-hand-holding-heart"></i>
        </button>
      </div>

      <!-- 语音识别状态指示器 -->
      <div id="voice-status" class="voice-status">
        <span id="voice-status-text">正在聆听...</span>
      </div>

      <!-- 顶部导航 -->
      <div class="header">
        <div class="logo">
          <i class="fas fa-dragon"></i>
          <span>江苏国家级戏曲类非遗数字平台</span>
        </div>
      </div>

      <!-- 语言选择页面 -->
      <div id="language-page" class="page active">
        <h1 data-simple="选择语言">选择您的语言 / Select Your Language</h1>
        <p data-simple="请选择一种语言">请选择您偏好的语言界面 / Please select your preferred language interface</p>

        <div class="language-grid">
          <div class="language-card" onclick="selectLanguage('zh-CN')">
            <img src="https://flagcdn.com/w80/cn.png"
                 onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/country-flag-icons@3.5.0/3x2/CN.svg'"
                 alt="中文">
            <h3>中文</h3>
          </div>
          <div class="language-card" onclick="selectLanguage('en')">
            <img src="https://flagcdn.com/w80/us.png"
                 onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/country-flag-icons@3.5.0/3x2/US.svg'"
                 alt="English">
            <h3>English</h3>
          </div>
          <div class="language-card" onclick="selectLanguage('es')">
            <img src="https://flagcdn.com/w80/es.png"
                 onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/country-flag-icons@3.5.0/3x2/ES.svg'"
                 alt="Español">
            <h3>Español</h3>
          </div>
          <div class="language-card" onclick="selectLanguage('fr')">
            <img src="https://flagcdn.com/w80/fr.png"
                 onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/country-flag-icons@3.5.0/3x2/FR.svg'"
                 alt="Français">
            <h3>Français</h3>
          </div>
          <div class="language-card" onclick="selectLanguage('ja')">
            <img src="https://flagcdn.com/w80/jp.png"
                 onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/country-flag-icons@3.5.0/3x2/JP.svg'"
                 alt="日本語">
            <h3>日本語</h3>
          </div>
          <div class="language-card" onclick="selectLanguage('ar')">
            <img src="https://flagcdn.com/w80/sa.png"
                 onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/country-flag-icons@3.5.0/3x2/SA.svg'"
                 alt="العربية">
            <h3>العربية</h3>
          </div>
        </div>

        <div class="button-container" style="margin-top: 16px;">
          <!-- 占位：语言页没有返回按钮 -->
        </div>
      </div>

      <!-- 曲种选择页面（风格与语言选择一致，复用样式） -->
      <div id="genre-page" class="page" style="display: none;">
        <h1 id="genre-page-title" data-simple="选择曲种">请选择曲种</h1>
        <p id="genre-page-desc" data-simple="请选择白局、昆曲、苏州评弹或扬剧">请选择白局、昆曲、苏州评弹或扬剧</p>

        <div class="language-grid">
          <div class="language-card" onclick="selectGenre('baiju')">
            <i class="fas fa-theater-masks" style="font-size: 42px; color: var(--primary);"></i>
            <h3 id="genre-option-baiju">白局</h3>
          </div>
          <div class="language-card" onclick="selectGenre('kunqu')">
            <i class="fas fa-music" style="font-size: 42px; color: var(--primary);"></i>
            <h3 id="genre-option-kunqu">昆曲</h3>
          </div>
          <div class="language-card" onclick="selectGenre('pintang')">
            <i class="fas fa-guitar" style="font-size: 42px; color: var(--primary);"></i>
            <h3 id="genre-option-pintang">苏州评弹</h3>
          </div>
          <div class="language-card" onclick="selectGenre('yangju')">
            <i class="fas fa-theater-masks" style="font-size: 42px; color: var(--primary);"></i>
            <h3 id="genre-option-yangju">扬剧</h3>
          </div>
        </div>

        <div class="button-container">
          <button class="btn back-btn" onclick="goBackToLanguageFromGenre()" id="genre-back-btn">返回语言选择</button>
        </div>
      </div>

      <!-- 功能页面 -->
      <div id="feature-page" class="page">
        <h1 id="feature-title" data-simple="白局数字平台">江苏国家级戏曲类非遗数字平台</h1>
        <p id="feature-description" data-simple="探索南京白局的数字体验">
          探索南京白局非遗文化的数字化体验，感受传统与现代科技的完美融合</p>

        <div class="feature-grid">
          <div class="feature-card" onclick="showFeatureDetail('feature1')">
            <i class="fas fa-user-circle"></i>
            <div class="badge">热门</div>
            <h3 id="feature1-title" data-simple="虚拟演唱">虚拟传承人演唱展示</h3>
            <p id="feature1-desc" data-simple="虚拟形象演唱白局">数字化还原的白局传承人虚拟形象，展示传统唱腔与表演</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature2')">
            <i class="fas fa-microphone-alt"></i>
            <div class="badge">新功能</div>
            <h3 id="feature2-title" data-simple="AI跟唱">AI语音跟唱训练</h3>
            <p id="feature2-desc" data-simple="分析歌声并给出建议">实时分析音高、节奏、发音，提供专业跟唱指导</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature3')">
            <i class="fas fa-chalkboard-teacher"></i>
            <h3 id="feature3-title" data-simple="虚拟课堂">虚拟课堂沉浸式教学</h3>
            <p id="feature3-desc" data-simple="学历史与唱腔">在虚拟场景中学习白局历史与唱腔技巧</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature4')">
            <i class="fas fa-book-open"></i>
            <h3 id="feature4-title" data-simple="知识库与展厅">白局知识库与文化展厅</h3>
            <p id="feature4-desc" data-simple="了解白局的起源与人物">了解白局起源、发展、代表人物等丰富文化知识</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature5')">
            <i class="fas fa-paint-brush"></i>
            <div class="badge">创意</div>

            <h3 id="feature5-title" data-simple="AI创作">AI创作与分享中心</h3>
            <p id="feature5-desc" data-simple="生成唱词旋律并分享">AI自动生成白局唱词与旋律，一键分享至社交平台</p>
          </div>

          <div class="feature-card" onclick="showFeatureDetail('feature6')">
            <i class="fas fa-comment-dots"></i>
            <div class="badge">互动</div>
            <h3 id="feature6-title" data-simple="意见反馈">意见与反馈</h3>
            <p id="feature6-desc" data-simple="欢迎给我们建议">提出宝贵建议，帮助我们改进平台体验</p>
          </div>
        </div>
        <div class="button-container">
          <button class="btn back-btn" onclick="goBackToLanguage()" id="back-btn" data-simple="返回语言">返回语言选择
          </button>
          <button class="btn" id="help-btn" onclick="showHelp()" data-simple="帮助">获取帮助</button>
        </div>
      </div>

      <!-- 功能页面：昆曲 -->
      <div id="feature-page-kunqu" class="page" style="display: none;">
        <h1 data-simple="昆曲数字平台">南京昆曲非遗文化数字平台</h1>
        <p data-simple="探索昆曲的数字体验">探索昆曲的数字化体验，感受传统与现代科技的完美融合</p>
        <div class="feature-grid">
          <div class="feature-card" onclick="showFeatureDetail('feature1')">
            <i class="fas fa-user-circle"></i>
            <div class="badge">热门</div>
            <h3 data-simple="虚拟演唱">虚拟传承人演唱展示</h3>
            <p data-simple="虚拟形象演唱昆曲">数字化还原的传承人虚拟形象，展示传统唱腔与表演</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature2')">
            <i class="fas fa-microphone-alt"></i>
            <div class="badge">新功能</div>
            <h3 data-simple="AI跟唱">AI语音跟唱训练</h3>
            <p data-simple="分析歌声并给出建议">实时分析音高、节奏、发音，提供专业跟唱指导</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature3')">
            <i class="fas fa-chalkboard-teacher"></i>
            <h3 data-simple="虚拟课堂">虚拟课堂沉浸式教学</h3>
            <p data-simple="学历史与唱腔">在虚拟场景中学习昆曲历史与唱腔技巧</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature4')">
            <i class="fas fa-book-open"></i>
            <h3 data-simple="知识库与展厅">昆曲知识库与文化展厅</h3>
            <p data-simple="了解昆曲的起源与人物">了解昆曲起源、发展、代表人物等文化知识</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature5')">
            <i class="fas fa-paint-brush"></i>
            <div class="badge">创意</div>
            <h3 data-simple="AI创作">AI创作与分享中心</h3>
            <p data-simple="生成唱词旋律并分享">AI自动生成唱词与旋律，一键分享至社交平台</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature6')">
            <i class="fas fa-comment-dots"></i>
            <div class="badge">互动</div>
            <h3 data-simple="意见反馈">意见与反馈</h3>
            <p data-simple="欢迎给我们建议">提出宝贵建议，帮助我们改进平台体验</p>
          </div>
        </div>
        <div class="button-container">
          <button class="btn back-btn" onclick="goBackToLanguage()" id="back-btn-kunqu" data-simple="返回曲种">
            返回曲种选择
          </button>
          <button class="btn" onclick="showHelp()" data-simple="帮助">获取帮助</button>
        </div>
      </div>

      <!-- 功能页面：苏州评弹 -->
      <div id="feature-page-pintang" class="page" style="display: none;">
        <h1 data-simple="评弹数字平台">苏州评弹非遗文化数字平台</h1>
        <p data-simple="探索评弹的数字体验">探索苏州评弹的数字化体验，感受传统与现代科技的完美融合</p>
        <div class="feature-grid">
          <div class="feature-card" onclick="showFeatureDetail('feature1')">
            <i class="fas fa-user-circle"></i>
            <div class="badge">热门</div>
            <h3 data-simple="虚拟演唱">虚拟传承人演唱展示</h3>
            <p data-simple="虚拟形象演唱评弹">数字化还原的传承人虚拟形象，展示传统唱腔与表演</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature2')">
            <i class="fas fa-microphone-alt"></i>
            <div class="badge">新功能</div>
            <h3 data-simple="AI跟唱">AI语音跟唱训练</h3>
            <p data-simple="分析歌声并给出建议">实时分析音高、节奏、发音，提供专业跟唱指导</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature3')">
            <i class="fas fa-chalkboard-teacher"></i>
            <h3 data-simple="虚拟课堂">虚拟课堂沉浸式教学</h3>
            <p data-simple="学历史与表演">在虚拟场景中学习评弹历史与表演技巧</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature4')">
            <i class="fas fa-book-open"></i>
            <h3 data-simple="知识库与展厅">评弹知识库与文化展厅</h3>
            <p data-simple="了解评弹的起源与人物">了解评弹起源、发展、代表人物等文化知识</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature5')">
            <i class="fas fa-paint-brush"></i>
            <div class="badge">创意</div>
            <h3 data-simple="AI创作">AI创作与分享中心</h3>
            <p data-simple="生成唱词旋律并分享">AI自动生成唱词与旋律，一键分享至社交平台</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature6')">
            <i class="fas fa-comment-dots"></i>
            <div class="badge">互动</div>
            <h3 data-simple="意见反馈">意见与反馈</h3>
            <p data-simple="欢迎给我们建议">提出宝贵建议，帮助我们改进平台体验</p>
          </div>
        </div>
        <div class="button-container">
          <button class="btn back-btn" onclick="goBackToLanguage()" id="back-btn-pintang" data-simple="返回曲种">
            返回曲种选择
          </button>
          <button class="btn" onclick="showHelp()" data-simple="帮助">获取帮助</button>
        </div>
      </div>

      <!-- 功能页面：扬剧 -->
      <div id="feature-page-yangju" class="page" style="display: none;">
        <h1 data-simple="扬剧数字平台">扬剧非遗文化数字平台</h1>
        <p data-simple="探索扬剧的数字体验">探索扬剧的数字化体验，感受传统与现代科技的完美融合</p>
        <div class="feature-grid">
          <div class="feature-card" onclick="showFeatureDetail('feature1')">
            <i class="fas fa-user-circle"></i>
            <div class="badge">热门</div>
            <h3 data-simple="虚拟演唱">虚拟传承人演唱展示</h3>
            <p data-simple="虚拟形象演唱扬剧">数字化还原的传承人虚拟形象，展示传统唱腔与表演</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature2')">
            <i class="fas fa-microphone-alt"></i>
            <div class="badge">新功能</div>
            <h3 data-simple="AI跟唱">AI语音跟唱训练</h3>
            <p data-simple="分析歌声并给出建议">实时分析音高、节奏、发音，提供专业跟唱指导</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature3')">
            <i class="fas fa-chalkboard-teacher"></i>
            <h3 data-simple="虚拟课堂">虚拟课堂沉浸式教学</h3>
            <p data-simple="学历史与唱腔">在虚拟场景中学习扬剧历史与唱腔技巧</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature4')">
            <i class="fas fa-book-open"></i>
            <h3 data-simple="知识库与展厅">扬剧知识库与文化展厅</h3>
            <p data-simple="了解扬剧的起源与人物">了解扬剧起源、发展、代表人物等文化知识</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature5')">
            <i class="fas fa-paint-brush"></i>
            <div class="badge">创意</div>
            <h3 data-simple="AI创作">AI创作与分享中心</h3>
            <p data-simple="生成唱词旋律并分享">AI自动生成唱词与旋律，一键分享至社交平台</p>
          </div>
          <div class="feature-card" onclick="showFeatureDetail('feature6')">
            <i class="fas fa-comment-dots"></i>
            <div class="badge">互动</div>
            <h3 data-simple="意见反馈">意见与反馈</h3>
            <p data-simple="欢迎给我们建议">提出宝贵建议，帮助我们改进平台体验</p>
          </div>
        </div>
        <div class="button-container">
          <button class="btn back-btn" onclick="goBackToLanguage()" id="back-btn-yangju" data-simple="返回曲种">
            返回曲种选择
          </button>
          <button class="btn" onclick="showHelp()" data-simple="帮助">获取帮助</button>
        </div>
      </div>
    </div>

    <!-- 功能详情弹窗 - 全部移到容器外部 -->
    <!-- 功能一：虚拟传承人演唱展示 -->
    <div id="feature1-detail" class="feature-detail">
      <button class="close-btn" onclick="closeFeatureDetail('feature1')">&times;</button>
      <h3 id="f1-title">虚拟传承人演唱展示</h3>
      <p id="f1-desc">
        通过先进的虚拟人技术，我们数字化还原了白局传承人的形象、服饰和动作。虚拟传承人将为您演唱经典白局唱段，展示传统唱腔与表演技巧。</p>

      <div class="virtual-character">
        <div class="character-container">
          <!-- 新的虚拟人物动画 -->
          <video
              ref="virtual-video"
              loop
              style="width: 300px; height: 400px; border-radius: 20px; object-fit: cover;"
              preload="metadata"
          >
            <source src="../../assets/白局小明视频.mp4" type="video/mp4">
            您的浏览器不支持视频播放。
          </video>
        </div>

        <!-- 表演状态显示 -->
        <div id="performance-text" class="performance-text"></div>


        <!-- 控制按钮 -->
        <div class="character-controls">
          <button class="btn" id="f1-btn-play1" onclick="playPerformance('song1')">
            <i class="fas fa-play"></i> 播放《秦淮灯会》
          </button>
          <button class="btn" id="f1-btn-play2" onclick="playPerformance('song2')">
            <i class="fas fa-play"></i> 播放《金陵四季》
          </button>
          <button class="btn" id="f1-btn-stop" onclick="stopPerformance()">
            <i class="fas fa-stop"></i> 停止播放
          </button>
        </div>
      </div>


      <div class="conversation-panel" id="feature1-conversation-panel">
        <div class="conversation-header">
          <h4 id="feature1-conversation-title">互动问答</h4>
          <div class="conversation-toggles">
            <label class="toggle">
              <input type="checkbox" id="feature1-auto-detect" checked>
              <span id="feature1-auto-label">自动识别语言</span>
            </label>
            <label class="toggle">
              <input type="checkbox" id="feature1-tts-toggle" checked>
              <span id="feature1-tts-label">语音播报</span>
            </label>
            <div class="detected-language">
              <span id="feature1-detected-language-label">识别语言：</span>
              <span id="feature1-detected-language-text">-</span>
            </div>
          </div>
        </div>
        <div class="conversation-status" id="feature1-status-text"></div>
        <div id="feature1-chat-log" class="chat-log"></div>
        <div class="conversation-input">
          <button class="btn voice-btn" id="feature1-voice-btn">语音提问</button>
          <input type="text" id="feature1-question-input" placeholder="输入您的问题..."/>
          <button class="btn" id="feature1-send-btn">发送</button>
        </div>
      </div>
    </div>

    <!-- 功能二：AI语音跟唱训练 -->
    <div id="feature2-detail" class="feature-detail">
      <button class="close-btn" onclick="closeFeatureDetail('feature2')">&times;</button>
      <h3 id="f2-title" data-simple="AI跟唱">AI语音跟唱训练</h3>
      <p id="f2-desc" data-simple="分析歌声并给出建议">
        通过AI技术分析您的跟唱表现，实时提供音高、节奏和发音的反馈，帮助您快速掌握白局唱腔技巧。</p>

      <div class="singing-interface">
        <h4 id="f2-choose">选择唱段</h4>
        <div style="display: flex; gap: 10px; margin: 15px 0;">
          <button class="btn" id="f2-btn-song1" style="padding: 8px 15px;" onclick="selectTrainingSong('song1')">
            秦淮灯会
          </button>
          <button class="btn" id="f2-btn-song2" style="padding: 8px 15px;" onclick="selectTrainingSong('song2')">
            金陵四季
          </button>
          <button class="btn" id="f2-btn-song3" style="padding: 8px 15px;" onclick="selectTrainingSong('song3')">
            南京美食
          </button>
        </div>

        <div class="lyrics-container">
          <h4 id="f2-lyrics-title">歌词</h4>
          <div id="lyrics-display">
            <div class="lyric-line">秦淮河畔灯火明，</div>
            <div class="lyric-line">游人如织喜盈盈。</div>
            <div class="lyric-line">白局一曲传千古，</div>
            <div class="lyric-line">文化传承永不停。</div>
          </div>
        </div>

        <div class="score-display">
          <div class="score-item">
            <div class="score-value" id="pitch-score">85</div>
            <div id="label-pitch">音准评分</div>
          </div>
          <div class="score-item">
            <div class="score-value" id="rhythm-score">78</div>
            <div id="label-rhythm">节奏评分</div>
          </div>
          <div class="score-item">
            <div class="score-value" id="pronunciation-score">92</div>
            <div id="label-pronunciation">发音评分</div>
          </div>
        </div>

        <button class="btn" style="width: 100%;" id="start-singing">开始跟唱</button>
      </div>
    </div>

    <!-- 功能三：虚拟课堂沉浸式教学 -->
    <div id="feature3-detail" class="feature-detail">
      <button class="close-btn" onclick="closeFeatureDetail('feature3')">&times;</button>
      <h3 id="f3-title">虚拟课堂沉浸式教学</h3>
      <p id="f3-desc">在虚拟场景中学习白局历史与唱腔技巧，虚拟老师将为您讲解白局知识，并回答您的提问。</p>

      <div class="virtual-scene">
        <div class="scene-content">
          <i class="fas fa-university" style="font-size: 4rem; color: var(--primary); margin-bottom: 15px;"></i>
          <h4 id="f3-scene-title">秦淮河畔虚拟课堂</h4>
          <p id="f3-scene-sub">选择您想学习的课程内容</p>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h4 id="f3-courses-title">课程选择</h4>
        <div class="knowledge-grid">
          <div class="knowledge-card" onclick="selectCourse('history')">
            <i class="fas fa-landmark"></i>
            <h5 id="f3-course1-title">白局历史</h5>
            <p id="f3-course1-desc">了解白局的起源与发展历程</p>
          </div>
          <div class="knowledge-card" onclick="selectCourse('technique')">
            <i class="fas fa-music"></i>
            <h5 id="f3-course2-title">唱腔技巧</h5>
            <p id="f3-course2-desc">学习白局的独特唱腔与表演技巧</p>
          </div>
          <div class="knowledge-card" onclick="selectCourse('instruments')">
            <i class="fas fa-drum"></i>
            <h5 id="f3-course3-title">乐器介绍</h5>
            <p id="f3-course3-desc">认识白局表演中使用的传统乐器</p>
          </div>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h4 id="f3-qa-title">语音提问</h4>
        <div style="display: flex; gap: 10px;">
          <input id="f3-qa-input" type="text" placeholder="输入您的问题..."
                 style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          <button id="f3-qa-btn" class="btn" style="padding: 10px 20px;">提问</button>
        </div>
      </div>
    </div>

    <!-- 功能四：白局知识库与文化展厅 -->
    <div id="feature4-detail" class="feature-detail">
      <button class="close-btn" onclick="closeFeatureDetail('feature4')">&times;</button>
      <h3 id="f4-title">白局知识库与文化展厅</h3>
      <p id="f4-desc">了解白局起源、发展、代表人物等丰富文化知识，支持多语言展示。</p>

      <div class="knowledge-grid">
        <div class="knowledge-card">
          <i class="fas fa-history"></i>
          <h5 id="f4-card1-title">历史渊源</h5>
          <p id="f4-card1-desc">白局起源于明代，是南京地区的传统曲艺形式</p>
          <button id="f4-card1-btn" class="btn" style="padding: 5px 10px; margin-top: 10px; font-size: 0.9rem;">
            了解更多
          </button>
        </div>
        <div class="knowledge-card">
          <i class="fas fa-user-friends"></i>
          <h5 id="f4-card2-title">代表人物</h5>
          <p id="f4-card2-desc">了解历代白局传承人及其艺术成就</p>
          <button id="f4-card2-btn" class="btn" style="padding: 5px 10px; margin-top: 10px; font-size: 0.9rem;">
            了解更多
          </button>
        </div>
        <div class="knowledge-card">
          <i class="fas fa-drum"></i>
          <h5 id="f4-card3-title">乐器介绍</h5>
          <p id="f4-card3-desc">认识白局表演中使用的传统乐器</p>
          <button id="f4-card3-btn" class="btn" style="padding: 5px 10px; margin-top: 10px; font-size: 0.9rem;">
            了解更多
          </button>
        </div>
        <div class="knowledge-card">
          <i class="fas fa-tshirt"></i>
          <h5 id="f4-card4-title">服饰文化</h5>
          <p id="f4-card4-desc">了解白局表演的传统服饰与装扮</p>
          <button id="f4-card4-btn" class="btn" style="padding: 5px 10px; margin-top: 10px; font-size: 0.9rem;">
            了解更多
          </button>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h4 id="f4-lang-title">语言切换</h4>
        <div class="language-selector">
          <div class="lang-option active" id="f4-lang-zh">中文</div>
          <div class="lang-option" id="f4-lang-en">English</div>
          <div class="lang-option" id="f4-lang-es">Español</div>
          <div class="lang-option" id="f4-lang-fr">Français</div>
          <div class="lang-option" id="f4-lang-ja">日本語</div>
          <div class="lang-option" id="f4-lang-ar">العربية</div>
        </div>
      </div>
    </div>

    <!-- 功能五：AI创作与分享中心 -->
    <div id="feature5-detail" class="feature-detail">
      <button class="close-btn" onclick="closeFeatureDetail('feature5')">&times;</button>
      <h3 id="f5-title">AI创作与分享中心</h3>
      <p id="f5-desc">输入主题词，AI将自动生成新的白局唱词与旋律，支持多语言输出。</p>

      <div class="ai-creation">
        <h4 id="f5-input-title">输入创作主题</h4>
        <input id="f5-input" type="text" class="theme-input" placeholder="例如：南京美食、龙舟节、金陵秋色...">

        <h4 id="f5-select-lang-title">选择输出语言</h4>
        <div class="language-selector">
          <div class="lang-option active">中文</div>
          <div class="lang-option">English</div>
          <div class="lang-option">Español</div>
          <div class="lang-option">Français</div>
          <div class="lang-option">日本語</div>
          <div class="lang-option">العربية</div>
        </div>

        <button id="f5-generate-btn" class="btn" style="width: 100%; margin: 15px 0;">生成白局作品</button>

        <div class="creation-result">
          <h4 id="f5-output-title">创作结果</h4>
          <p id="creation-text">输入主题后，AI将在这里生成白局唱词...</p>
        </div>

        <button id="f5-preview-btn" class="btn" style="width: 100%;">试听作品</button>
        <button id="f5-share-btn" class="btn" style="width: 100%; margin-top: 10px; background: var(--accent);">
          分享到社交平台
        </button>
      </div>
    </div>
    <!-- 在功能详情弹窗部分添加 -->
    <!-- 功能六：意见与反馈 -->
    <div id="feature6-detail" class="feature-detail">
      <button class="close-btn" onclick="closeFeatureDetail('feature6')">&times;</button>
      <h3 id="f6-title" data-simple="意见反馈">意见与反馈</h3>
      <p id="f6-desc" data-simple="欢迎提出建议">您的宝贵意见将帮助我们不断改进平台，为您提供更好的服务体验。</p>

      <div class="feedback-interface">
        <div class="feedback-form">
          <div class="form-group">
            <label id="f6-type-label" for="feedback-type">反馈类型</label>
            <select id="feedback-type" class="form-select">
              <option id="f6-type-suggestion" value="suggestion">功能建议</option>
              <option id="f6-type-bug" value="bug">问题反馈</option>
              <option id="f6-type-content" value="content">内容建议</option>
              <option id="f6-type-other" value="other">其他</option>
            </select>
          </div>

          <div class="form-group">
            <label id="f6-title-label" for="feedback-title">标题</label>
            <input type="text" id="feedback-title" class="form-input" placeholder="请简要描述您的反馈">
          </div>

          <div class="form-group">
            <label id="f6-content-label" for="feedback-content">详细内容</label>
            <textarea id="feedback-content" class="form-textarea" placeholder="请详细描述您的建议或遇到的问题..."
                      rows="6"></textarea>
          </div>

          <div class="form-group">
            <label id="f6-contact-label" for="contact-info">联系方式（选填）</label>
            <input type="text" id="contact-info" class="form-input" placeholder="邮箱或电话，方便我们回复您">
          </div>

          <div class="form-group">
            <label id="f6-rating-label">满意度评分</label>
            <div class="rating-stars">
              <span class="star" data-rating="1">★</span>
              <span class="star" data-rating="2">★</span>
              <span class="star" data-rating="3">★</span>
              <span class="star" data-rating="4">★</span>
              <span class="star" data-rating="5">★</span>
            </div>
            <div class="rating-text" id="rating-text">请选择评分</div>
          </div>

          <button id="f6-submit-btn" class="btn" style="width: 100%;" onclick="submitFeedback()">提交反馈</button>
        </div>

        <div class="feedback-history" style="margin-top: 30px; display: none;" id="feedback-history">
          <h4 id="f6-history-title">反馈记录</h4>
          <div id="feedback-list" class="feedback-list">
            <!-- 反馈记录将在这里显示 -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import './css/index.css'
import './css/main.css'
import './css/style.css'
import {initStarRating} from "./js";
import {initTrainingModule, originalTexts, replaceTextIds} from "./js/main.js"

// 定义组件接收的属性
defineProps<{
  msg: string
}>()

// 模块加载调试
console.log('main.js 模块开始加载');

// 管理内部状态
const count = ref(0)
const increment = () => {
  count.value++
}

onMounted(() => {
  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成');
    document.getElementById('language-page').classList.add('active');
    document.getElementById('genre-page').classList.remove('active');
    document.getElementById('genre-page').style.display = 'none';
    document.getElementById('feature-page').classList.remove('active');

    replaceTextIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        originalTexts[id] = el.textContent;
      }
    });

    document.querySelectorAll('.lang-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.lang-option').forEach(opt => {
          opt.classList.remove('active');
        });
        option.classList.add('active');
      });
    });

    initStarRating();
    initTrainingModule();
  });


  // 页面加载完成后初始化
  console.log('页面加载完成');
  // 确保语言选择页面是激活状态
  document.getElementById('language-page').classList.add('active');
  document.getElementById('genre-page').classList.remove('active');
  document.getElementById('genre-page').style.display = 'none';
  document.getElementById('feature-page').classList.remove('active');

  // 初始化基线文本
  replaceTextIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) originalTexts[id] = el.textContent;
  });

  // 初始化语言选项点击事件
  document.querySelectorAll('.lang-option').forEach(option => {
    option.addEventListener('click', function () {
      document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.remove('active');
      });
      this.classList.add('active');
    });
    initStarRating();
  });


  // 初始化跟唱按钮
  document.getElementById('start-singing').addEventListener('click', function () {
    // 模拟跟唱评分过程
    const lyrics = document.querySelectorAll('.lyric-line');
    lyrics.forEach((line, index) => {
      setTimeout(() => {
        line.classList.add(index % 2 === 0 ? 'correct' : 'incorrect');
      }, 1000 * (index + 1));
    });

    // 更新评分
    setTimeout(() => {
      document.getElementById('pitch-score').textContent = String(Math.floor(Math.random() * 20 + 80));
      document.getElementById('rhythm-score').textContent = String(Math.floor(Math.random() * 20 + 75));
      document.getElementById('pronunciation-score').textContent = String(Math.floor(Math.random() * 20 + 85));
    }, 5000);
  });
})

</script>

<style scoped>

.my-component {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 1rem 0;
}
</style>
