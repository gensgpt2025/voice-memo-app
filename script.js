class MemoApp {
    constructor() {
        this.isAuthenticated = false;
        this.isRecording = false;
        this.recognition = null;
        this.spreadsheetId = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeGoogleAPI();
        this.initializeSpeechRecognition();
        this.loadCustomTags();
    }

    initializeElements() {
        // 認証関連
        this.loginBtn = document.getElementById('loginBtn');
        this.userInfo = document.getElementById('userInfo');
        
        // 入力関連
        this.voiceBtn = document.getElementById('voiceBtn');
        this.textBtn = document.getElementById('textBtn');
        this.memoText = document.getElementById('memoText');
        this.voiceStatus = document.getElementById('voiceStatus');
        
        // タグ関連
        this.tagSelect = document.getElementById('tagSelect');
        this.addTagBtn = document.getElementById('addTagBtn');
        this.tagModal = document.getElementById('tagModal');
        this.newTagInput = document.getElementById('newTagInput');
        this.confirmTagBtn = document.getElementById('confirmTagBtn');
        this.cancelTagBtn = document.getElementById('cancelTagBtn');
        
        // アクション
        this.saveBtn = document.getElementById('saveBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.statusMessage = document.getElementById('statusMessage');
    }

    initializeEventListeners() {
        // 認証
        this.loginBtn.addEventListener('click', () => this.handleAuth());
        
        // 入力モード切替
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        this.textBtn.addEventListener('click', () => this.switchToTextInput());
        
        // メモ入力
        this.memoText.addEventListener('input', () => this.updateSaveButton());
        
        // タグ管理
        this.addTagBtn.addEventListener('click', () => this.showTagModal());
        this.confirmTagBtn.addEventListener('click', () => this.addCustomTag());
        this.cancelTagBtn.addEventListener('click', () => this.hideTagModal());
        
        // アクション
        this.saveBtn.addEventListener('click', () => this.saveMemo());
        this.clearBtn.addEventListener('click', () => this.clearMemo());
        
        // モーダル外クリック
        this.tagModal.addEventListener('click', (e) => {
            if (e.target === this.tagModal) this.hideTagModal();
        });
        
        // エンターキーでタグ追加
        this.newTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCustomTag();
        });
    }

    async initializeGoogleAPI() {
        try {
            await new Promise((resolve, reject) => {
                gapi.load('auth2:client', resolve);
            });
            
            await gapi.client.init({
                apiKey: window.APP_CONFIG?.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE',
                clientId: window.APP_CONFIG?.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                scope: 'https://www.googleapis.com/auth/spreadsheets'
            });
            
            this.authInstance = gapi.auth2.getAuthInstance();
            this.updateAuthState();
            
        } catch (error) {
            console.error('Google API初期化エラー:', error);
            console.log('詳細エラー:', error.details || error.message);
            this.showMessage('Google API の初期化に失敗しました: ' + (error.message || error), 'error');
        }
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.lang = 'ja-JP';
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            
            this.recognition.onstart = () => {
                this.isRecording = true;
                this.voiceStatus.classList.remove('hidden');
                this.voiceBtn.textContent = '⏹️ 停止';
                this.voiceBtn.classList.add('active');
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                this.memoText.value = finalTranscript + interimTranscript;
                this.updateSaveButton();
            };
            
            this.recognition.onend = () => {
                this.isRecording = false;
                this.voiceStatus.classList.add('hidden');
                this.voiceBtn.textContent = '🎤 音声入力';
                this.voiceBtn.classList.remove('active');
            };
            
            this.recognition.onerror = (event) => {
                console.error('音声認識エラー:', event.error);
                this.showMessage('音声認識でエラーが発生しました', 'error');
            };
            
            this.voiceBtn.disabled = false;
        } else {
            this.showMessage('このブラウザは音声認識に対応していません', 'info');
        }
    }

    async handleAuth() {
        if (!this.authInstance) {
            this.showMessage('Google API が初期化されていません', 'error');
            return;
        }
        
        try {
            if (this.isAuthenticated) {
                await this.authInstance.signOut();
            } else {
                await this.authInstance.signIn();
            }
            this.updateAuthState();
        } catch (error) {
            console.error('認証エラー:', error);
            this.showMessage('認証でエラーが発生しました', 'error');
        }
    }

    updateAuthState() {
        if (!this.authInstance) return;
        
        this.isAuthenticated = this.authInstance.isSignedIn.get();
        
        if (this.isAuthenticated) {
            const user = this.authInstance.currentUser.get();
            const profile = user.getBasicProfile();
            
            this.loginBtn.textContent = 'ログアウト';
            this.userInfo.textContent = profile.getName();
            this.userInfo.classList.remove('hidden');
            this.saveBtn.disabled = false;
            
            this.initializeSpreadsheet();
        } else {
            this.loginBtn.textContent = 'Googleログイン';
            this.userInfo.classList.add('hidden');
            this.saveBtn.disabled = true;
        }
    }

    async initializeSpreadsheet() {
        try {
            // スプレッドシートを作成または取得
            const response = await gapi.client.sheets.spreadsheets.create({
                properties: {
                    title: '音声メモアプリ - ' + new Date().toLocaleDateString('ja-JP')
                }
            });
            
            this.spreadsheetId = response.result.spreadsheetId;
            
            // ヘッダー行を追加
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: 'A1:C1',
                valueInputOption: 'RAW',
                resource: {
                    values: [['日時', 'タグ', 'メモ内容']]
                }
            });
            
            this.showMessage('スプレッドシートが準備できました', 'success');
            
        } catch (error) {
            console.error('スプレッドシート初期化エラー:', error);
            this.showMessage('スプレッドシートの初期化に失敗しました', 'error');
        }
    }

    toggleVoiceInput() {
        if (!this.recognition) {
            this.showMessage('音声認識が利用できません', 'error');
            return;
        }
        
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.memoText.value = '';
            this.recognition.start();
        }
    }

    switchToTextInput() {
        if (this.isRecording) {
            this.recognition.stop();
        }
        
        this.textBtn.classList.add('active');
        this.voiceBtn.classList.remove('active');
        this.memoText.focus();
    }

    updateSaveButton() {
        const hasContent = this.memoText.value.trim().length > 0;
        this.saveBtn.disabled = !hasContent || !this.isAuthenticated;
    }

    async saveMemo() {
        if (!this.isAuthenticated || !this.spreadsheetId) {
            this.showMessage('ログインしてください', 'error');
            return;
        }
        
        const memoContent = this.memoText.value.trim();
        if (!memoContent) {
            this.showMessage('メモ内容を入力してください', 'error');
            return;
        }
        
        try {
            const now = new Date();
            const timestamp = now.toLocaleString('ja-JP');
            const tag = this.tagSelect.value;
            
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'A:C',
                valueInputOption: 'RAW',
                resource: {
                    values: [[timestamp, tag, memoContent]]
                }
            });
            
            this.showMessage('メモを保存しました！', 'success');
            this.clearMemo();
            
        } catch (error) {
            console.error('保存エラー:', error);
            this.showMessage('保存に失敗しました', 'error');
        }
    }

    clearMemo() {
        this.memoText.value = '';
        this.updateSaveButton();
        this.memoText.focus();
    }

    showTagModal() {
        this.tagModal.classList.remove('hidden');
        this.newTagInput.focus();
    }

    hideTagModal() {
        this.tagModal.classList.add('hidden');
        this.newTagInput.value = '';
    }

    addCustomTag() {
        const newTag = this.newTagInput.value.trim();
        if (!newTag) {
            this.showMessage('タグ名を入力してください', 'error');
            return;
        }
        
        // 既存タグのチェック
        const existingOptions = Array.from(this.tagSelect.options).map(opt => opt.value);
        if (existingOptions.includes(newTag)) {
            this.showMessage('既に存在するタグです', 'error');
            return;
        }
        
        // タグを追加
        const option = document.createElement('option');
        option.value = newTag;
        option.textContent = `🏷️ ${newTag}`;
        this.tagSelect.appendChild(option);
        this.tagSelect.value = newTag;
        
        // ローカルストレージに保存
        this.saveCustomTags();
        
        this.hideTagModal();
        this.showMessage(`タグ「${newTag}」を追加しました`, 'success');
    }

    saveCustomTags() {
        const customTags = Array.from(this.tagSelect.options)
            .map(opt => opt.value)
            .filter(tag => !['メモ', '日記'].includes(tag));
        
        localStorage.setItem('customTags', JSON.stringify(customTags));
    }

    loadCustomTags() {
        try {
            const customTags = JSON.parse(localStorage.getItem('customTags') || '[]');
            customTags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = `🏷️ ${tag}`;
                this.tagSelect.appendChild(option);
            });
        } catch (error) {
            console.error('カスタムタグの読み込みエラー:', error);
        }
    }

    showMessage(text, type = 'info') {
        this.statusMessage.textContent = text;
        this.statusMessage.className = `status-message ${type}`;
        
        setTimeout(() => {
            this.statusMessage.textContent = '';
            this.statusMessage.className = 'status-message';
        }, 5000);
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new MemoApp();
});

// PWA サービスワーカー登録
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error => console.log('SW registration failed:', error));
}