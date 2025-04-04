import defaultWords from './defaultWords.js';

// 游戏状态
let gameState = {
    words: defaultWords, // 默认使用预设的单词列表
    currentChineseWord: '',
    player1Score: 0,
    player2Score: 0,
    matchedWords: new Set(),
    isGameStarted: false,
    totalWords: defaultWords.length,
    currentWordIndex: 0,
    displayWords: [] // 当前显示的单词列表
};

// 音效元素
const correctSound = document.getElementById('correct-sound');
const wrongSound = document.getElementById('wrong-sound');

// DOM 元素
const chineseHint = document.getElementById('chinese-hint');
const player1Area = document.getElementById('player1-area');
const player2Area = document.getElementById('player2-area');
const player1Score = document.getElementById('player1-score');
const player2Score = document.getElementById('player2-score');
const player1Progress = document.getElementById('player1-progress');
const player2Progress = document.getElementById('player2-progress');
const gameOver = document.getElementById('game-over');
const finalScore1 = document.getElementById('final-score1');
const finalScore2 = document.getElementById('final-score2');

// 按钮事件监听
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', handleFileImport);
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('reset-btn').addEventListener('click', resetGame);

// 文件导入处理
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: ['english', 'chinese']});
        
        // 移除表头（如果有）
        if (jsonData.length > 0 && typeof jsonData[0].english === 'string') {
            jsonData.shift();
        }

        gameState.words = jsonData;
        gameState.totalWords = jsonData.length;
        alert('文件导入成功！');
    };
    reader.readAsArrayBuffer(file);
}

// 开始游戏
function startGame() {
    if (gameState.words.length === 0) {
        alert('请先导入单词文件！');
        return;
    }

    gameState.isGameStarted = true;
    gameState.currentWordIndex = 0;
    gameState.matchedWords.clear();
    gameState.player1Score = 0;
    gameState.player2Score = 0;
    
    // 从所有单词中随机选择9个单词
    const selectedWords = selectRandomWords(gameState.words, 9);
    gameState.displayWords = selectedWords;
    gameState.totalWords = selectedWords.length;
    
    // 移除游戏区域的结束样式
    document.querySelector('.game-area').classList.remove('game-ended');
    
    updateScores();
    showNextChineseWord();
    createWordCards();
    
    // 隐藏游戏结束提示
    gameOver.classList.add('hidden');
}

// 从单词列表中随机选择指定数量的单词
function selectRandomWords(wordsList, count) {
    const shuffled = [...wordsList];
    shuffleArray(shuffled);
    return shuffled.slice(0, count);
}

// 重置游戏
function resetGame() {
    // 重新选择9个单词
    const selectedWords = selectRandomWords(gameState.words, 9);
    gameState.displayWords = selectedWords;
    gameState.totalWords = selectedWords.length;
    
    // 重置游戏状态
    gameState.currentWordIndex = 0;
    gameState.matchedWords.clear();
    gameState.player1Score = 0;
    gameState.player2Score = 0;
    
    // 设置游戏为开始状态
    gameState.isGameStarted = true;
    
    updateScores();
    showNextChineseWord();
    createWordCards();
    
    // 隐藏游戏结束提示
    gameOver.classList.add('hidden');
}

// 创建单词卡片
function createWordCards() {
    player1Area.innerHTML = '';
    player2Area.innerHTML = '';
    
    // 创建随机顺序的单词数组
    const shuffledWords = [...gameState.displayWords];
    shuffleArray(shuffledWords);
    
    // 使用随机顺序创建卡片
    shuffledWords.forEach(word => {
        // 为玩家1创建卡片
        const card1 = createWordCard(word.english);
        player1Area.appendChild(card1);
    });
    
    // 重新打乱顺序，确保两边顺序不同
    shuffleArray(shuffledWords);
    
    // 使用新的随机顺序为玩家2创建卡片
    shuffledWords.forEach(word => {
        // 为玩家2创建卡片
        const card2 = createWordCard(word.english);
        player2Area.appendChild(card2);
    });
}

// 语音合成功能
function speakWord(word) {
    // 检查浏览器是否支持语音合成
    if ('speechSynthesis' in window) {
        // 创建语音合成实例
        const utterance = new SpeechSynthesisUtterance(word);
        // 设置为英语发音
        utterance.lang = 'en-US';
        // 设置语速
        utterance.rate = 0.9;
        // 播放语音
        window.speechSynthesis.speak(utterance);
    }
}

// 创建单个单词卡片
function createWordCard(english) {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.innerHTML = `
        <div class="word-card-inner">
            <div class="word-card-front">
                <span class="word-text">${english}</span>
                <button class="speak-btn" title="点击发音">🔊</button>
            </div>
        </div>
    `;
    
    // 添加单词点击事件
    card.addEventListener('click', (e) => {
        // 如果点击的是发音按钮，则只播放发音
        if (e.target.classList.contains('speak-btn')) {
            e.stopPropagation(); // 阻止事件冒泡
            speakWord(english);
        } else {
            handleCardClick(card, english);
        }
    });
    
    return card;
}

// 处理卡片点击
function handleCardClick(card, english) {
    if (!gameState.isGameStarted || gameState.matchedWords.has(english)) return;
    
    const currentWord = gameState.displayWords[gameState.currentWordIndex];
    if (english === currentWord.english) {
        // 正确匹配时播放音效和发音
        correctSound.play();
        // 等音效播放完后再播放单词发音
        setTimeout(() => speakWord(english), 500);
        
        // 找到并禁用两边相同的单词卡片
        const allCards = document.querySelectorAll('.word-card');
        allCards.forEach(c => {
            const wordText = c.querySelector('.word-text').textContent;
            if (wordText === english) {
                c.classList.add('matched');
            }
        });
        
        gameState.matchedWords.add(english);
        
        // 更新得分
        const isPlayer1 = card.closest('#player1-area') !== null;
        if (isPlayer1) {
            gameState.player1Score++;
        } else {
            gameState.player2Score++;
        }
        updateScores();
        
        // 检查是否还有更多单词
        if (gameState.currentWordIndex < gameState.totalWords - 1) {
            gameState.currentWordIndex++;
            showNextChineseWord();
        } else {
            endGame();
        }
    } else {
        // 错误匹配
        wrongSound.play();
        card.classList.add('wrong');
        setTimeout(() => card.classList.remove('wrong'), 500);
    }
}

// 显示下一个中文词
function showNextChineseWord() {
    const currentWord = gameState.displayWords[gameState.currentWordIndex];
    chineseHint.innerHTML = `
        <div class="hint-content">
            <span>${currentWord.chinese}</span>
            <button class="speak-btn hint-speak-btn" title="听发音" onclick="event.stopPropagation(); window.speakCurrentWord();">🔊</button>
        </div>
    `;
}

// 将speakWord函数设为全局可访问
window.speakCurrentWord = function() {
    if (gameState.isGameStarted) {
        const currentWord = gameState.displayWords[gameState.currentWordIndex];
        speakWord(currentWord.english);
    }
};

// 更新分数和进度条
function updateScores() {
    player1Score.textContent = gameState.player1Score;
    player2Score.textContent = gameState.player2Score;
    
    // 使用玩家实际得分计算进度
    const progress1 = (gameState.player1Score / gameState.totalWords) * 100;
    const progress2 = (gameState.player2Score / gameState.totalWords) * 100;
    
    player1Progress.style.width = `${progress1}%`;
    player2Progress.style.width = `${progress2}%`;
}

// 结束游戏
function endGame() {
    gameState.isGameStarted = false;
    gameOver.classList.remove('hidden');
    finalScore1.textContent = gameState.player1Score;
    finalScore2.textContent = gameState.player2Score;
    
    // 添加结束提示和按钮说明
    const message = gameState.player1Score > gameState.player2Score ? 
        "玩家1获胜！" : gameState.player2Score > gameState.player1Score ? 
        "玩家2获胜！" : "平局！";
        
    gameOver.innerHTML = `
        <h1>Congratulations!!!</h1>
        <div class="final-score">
            玩家1: <span id="final-score1">${gameState.player1Score}</span>
            玩家2: <span id="final-score2">${gameState.player2Score}</span>
        </div>
        <div class="winner-message">${message}</div>
        <div class="game-over-hint">
            点击"重置游戏"开始新一轮，或点击"开始游戏"重新开始
        </div>
    `;
}

// 工具函数：打乱数组
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
} 