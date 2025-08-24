class MemoApp {
    constructor() {
        this.isAuthenticated = false;
        this.isRecording = false;
        this.recognition = null;
        this.spreadsheetId = null;
        this.FIXED_SPREADSHEET_ID = localStorage.getItem('memo_app_spreadsheet_id'); // 保存されたスプレッドシートIDを取得
        
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
            console.log('Config check:', window.APP_CONFIG);
            console.log('API Key available:', window.APP_CONFIG?.GOOGLE_API_KEY ? 'Yes' : 'No');
            console.log('Client ID available:', window.APP_CONFIG?.GOOGLE_CLIENT_ID ? 'Yes' : 'No');
            
            if (!window.APP_CONFIG?.GOOGLE_API_KEY || !window.APP_CONFIG?.GOOGLE_CLIENT_ID) {
                throw new Error('APIキーまたはクライアントIDが設定されていません。config.jsを確認してください。');
            }
            
            // Google API Client初期化
            await new Promise((resolve, reject) => {
                gapi.load('client', resolve);
            });
            
            await gapi.client.init({
                apiKey: 'AIzaSyC4gcw9yAjdByZJpC_Nga56jsl7LrPb_oE',
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });
            
            // Google Identity Services初期化
            google.accounts.id.initialize({
                client_id: '602143559288-cbm0nfgsu8tqkq50dtcg6fn3ps6f2j50.apps.googleusercontent.com',
                callback: this.handleCredentialResponse.bind(this),
                cancel_on_tap_outside: false
            });
            
            console.log('Google Identity Services 初期化完了');
            
            this.updateAuthState();
            
        } catch (error) {
            console.error('Google API初期化エラー:', error);
            console.log('詳細エラー:', error.details || error.message);
            this.showMessage('Google API の初期化に失敗しました: ' + (error.message || error), 'error');
        }
    }

    // スプレッドシートにデフォルトでフィルター機能を設定
    async setupSpreadsheetFilter() {
        try {
            // ヘッダー行にフィルターを適用
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [
                        {
                            setBasicFilter: {
                                filter: {
                                    range: {
                                        sheetId: 0,
                                        startRowIndex: 0, // ヘッダー行から
                                        startColumnIndex: 0, // A列から
                                        endColumnIndex: 4    // D列まで
                                    }
                                }
                            }
                        }
                    ]
                }
            });
            
            console.log('スプレッドシートにフィルター機能を設定しました');
            
        } catch (error) {
            console.error('フィルター設定エラー:', error);
            // エラーがあってもアプリの動作は継続
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
        console.log('ログインボタンがクリックされました');
        console.log('現在の認証状態:', this.isAuthenticated);
        console.log('google.accounts.id:', typeof google !== 'undefined' && google.accounts ? 'Available' : 'Not available');
        
        try {
            if (this.isAuthenticated) {
                // サインアウト
                console.log('サインアウト処理開始');
                google.accounts.id.disableAutoSelect();
                this.accessToken = null;
                this.isAuthenticated = false;
                this.updateAuthState();
                this.showMessage('ログアウトしました', 'info');
            } else {
                // サインイン
                console.log('サインイン処理開始');
                console.log('google.accounts.id.prompt実行中...');
                
                // 代替方法: OAuth 2.0 Token APIを直接使用
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: '602143559288-cbm0nfgsu8tqkq50dtcg6fn3ps6f2j50.apps.googleusercontent.com',
                    scope: 'https://www.googleapis.com/auth/spreadsheets',
                    callback: (tokenResponse) => {
                        console.log('トークンレスポンス受信:', tokenResponse);
                        this.accessToken = tokenResponse.access_token;
                        this.isAuthenticated = true;
                        this.updateAuthState();
                        this.initializeSpreadsheet();
                        this.showMessage('ログイン成功！', 'success');
                    }
                });
                
                console.log('OAuth 2.0 Token Client実行中...');
                tokenClient.requestAccessToken();
                
                this.showMessage('Googleログインポップアップを確認してください', 'info');
            }
        } catch (error) {
            console.error('認証エラー:', error);
            this.showMessage('認証でエラーが発生しました: ' + error.message, 'error');
        }
    }

    handleCredentialResponse(response) {
        // JWTトークンをデコード
        const payload = this.parseJwt(response.credential);
        console.log('User info:', payload);
        
        // OAuth 2.0アクセストークンを取得
        this.requestAccessToken(response.credential);
    }

    parseJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    async requestAccessToken(idToken) {
        try {
            // Google OAuth 2.0 Token APIを使用してアクセストークンを取得
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: '602143559288-cbm0nfgsu8tqkq50dtcg6fn3ps6f2j50.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/spreadsheets',
                callback: (tokenResponse) => {
                    this.accessToken = tokenResponse.access_token;
                    this.isAuthenticated = true;
                    this.updateAuthState();
                    this.initializeSpreadsheet();
                }
            });
            
            tokenClient.requestAccessToken();
        } catch (error) {
            console.error('アクセストークン取得エラー:', error);
            this.showMessage('認証に失敗しました', 'error');
        }
    }

    updateAuthState() {
        if (this.isAuthenticated && this.accessToken) {
            this.loginBtn.textContent = 'ログアウト';
            this.userInfo.textContent = 'ログイン済み';
            this.userInfo.classList.remove('hidden');
            this.saveBtn.disabled = false;
            
            // スプレッドシートが未初期化の場合は手動で実行
            if (!this.spreadsheetId) {
                console.log('スプレッドシートを手動で初期化中...');
                this.initializeSpreadsheet();
            }
        } else {
            this.loginBtn.textContent = 'Googleログイン';
            this.userInfo.classList.add('hidden');
            this.saveBtn.disabled = true;
        }
    }

    async initializeSpreadsheet() {
        try {
            // アクセストークンを設定
            gapi.client.setToken({
                access_token: this.accessToken
            });
            
            // 既存のスプレッドシートがある場合は再利用
            if (this.FIXED_SPREADSHEET_ID) {
                console.log('既存のスプレッドシートを使用:', this.FIXED_SPREADSHEET_ID);
                this.spreadsheetId = this.FIXED_SPREADSHEET_ID;
                
                // 既存スプレッドシートの確認
                try {
                    const sheetInfo = await gapi.client.sheets.spreadsheets.get({
                        spreadsheetId: this.spreadsheetId
                    });
                    console.log('既存スプレッドシートを確認しました:', sheetInfo.result.properties.title);
                } catch (error) {
                    console.log('既存スプレッドシートが見つからないため、新規作成します');
                    this.FIXED_SPREADSHEET_ID = null;
                    localStorage.removeItem('memo_app_spreadsheet_id');
                }
            }
            
            // 新しいスプレッドシートを作成（初回または既存が見つからない場合）
            if (!this.FIXED_SPREADSHEET_ID) {
                console.log('新しいスプレッドシートを作成中...');
                const response = await gapi.client.sheets.spreadsheets.create({
                    properties: {
                        title: '音声メモアプリ - メインデータ'
                    }
                });
                
                this.spreadsheetId = response.result.spreadsheetId;
                this.FIXED_SPREADSHEET_ID = this.spreadsheetId;
                
                // スプレッドシートIDをローカルストレージに保存
                localStorage.setItem('memo_app_spreadsheet_id', this.spreadsheetId);
                console.log('新しいスプレッドシートID:', this.spreadsheetId);
                
                // ヘッダー行を追加
                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: 'A1:D1',
                    valueInputOption: 'RAW',
                    resource: {
                        values: [['完了', '日時', 'タグ', 'メモ内容']]
                    }
                });
            }
            
            console.log('スプレッドシート準備完了（チェックボックスは動的追加）');
            
            // 条件付き書式を設定（取り消し線機能）
            await this.setupConditionalFormatting();
            
            // スプレッドシートにフィルター機能を追加
            await this.setupSpreadsheetFilter();
            
            this.showMessage('スプレッドシート準備完了（チェックボックス付き）', 'success');
            
            // スプレッドシートリンクを表示
            this.showSpreadsheetLink();
            
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
        console.log('=== saveMemo() 開始 ===');
        console.log('認証状態:', this.isAuthenticated);
        console.log('スプレッドシートID:', this.spreadsheetId);
        console.log('アクセストークン:', this.accessToken ? 'あり' : 'なし');
        
        // 保存ボタンの状態確認
        console.log('保存ボタンdisabled:', this.saveBtn.disabled);
        console.log('メモテキスト要素:', this.memoText);
        console.log('タグセレクト要素:', this.tagSelect);
        
        if (!this.isAuthenticated || !this.spreadsheetId || !this.accessToken) {
            this.showMessage('ログインしてください', 'error');
            return;
        }
        
        const memoContent = this.memoText.value.trim();
        console.log('メモ内容:', `"${memoContent}"`);
        console.log('メモ内容の長さ:', memoContent.length);
        
        if (!memoContent) {
            this.showMessage('メモ内容を入力してください', 'error');
            return;
        }
        
        try {
            const now = new Date();
            const timestamp = now.toLocaleString('ja-JP');
            const tag = this.tagSelect.value;
            
            console.log('保存データ:');
            console.log('- タイムスタンプ:', timestamp);
            console.log('- タグ:', tag);
            console.log('- メモ内容:', memoContent);
            
            // アクセストークンを設定
            gapi.client.setToken({
                access_token: this.accessToken
            });
            
            // ヘッダー行の直後に追加するため、まず現在のデータ範囲を確認
            let targetRow = 2; // ヘッダー行の次から開始
            
            // 既存データの最終行を確認
            try {
                const existingData = await gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: 'A:D'
                });
                
                if (existingData.result.values && existingData.result.values.length > 1) {
                    targetRow = existingData.result.values.length + 1;
                }
            } catch (rangeError) {
                console.log('既存データ確認エラー（初回の可能性）:', rangeError);
            }
            
            console.log('挿入先の行:', targetRow);
            
            // 特定の行に直接データを追加
            const updateResponse = await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `B${targetRow}:D${targetRow}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [[timestamp, tag, memoContent]]
                }
            });
            
            console.log('update response:', updateResponse);
            console.log(`行${targetRow}にメモを追加しました`);
            
            // 追加した行のA列にチェックボックスを設定
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [
                        {
                            setDataValidation: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: targetRow - 1,
                                    endRowIndex: targetRow,
                                    startColumnIndex: 0,
                                    endColumnIndex: 1
                                },
                                rule: {
                                    condition: {
                                        type: 'BOOLEAN'
                                    },
                                    inputMessage: '完了チェック',
                                    showCustomUi: true
                                }
                            }
                        },
                        {
                            updateCells: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: targetRow - 1,
                                    endRowIndex: targetRow,
                                    startColumnIndex: 0,
                                    endColumnIndex: 1
                                },
                                rows: [{
                                    values: [{
                                        userEnteredValue: {
                                            boolValue: false
                                        }
                                    }]
                                }],
                                fields: 'userEnteredValue'
                            }
                        }
                    ]
                }
            });
            
            console.log(`行${targetRow}のA列にチェックボックスを追加しました`);
            
            this.showMessage('✅ メモを保存しました！', 'success');
            this.clearMemo();
            
        } catch (error) {
            console.error('保存エラー:', error);
            console.log('エラー詳細:', error.result || error.message);
            this.showMessage('保存に失敗しました: ' + (error.result?.error?.message || error.message), 'error');
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

    // チェックボックス機能の実装
    async setupCheckboxForRow(rowNumber) {
        try {
            // チェックボックス（データ検証）と初期値を同時に設定
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [
                        {
                            setDataValidation: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: rowNumber - 1,
                                    endRowIndex: rowNumber,
                                    startColumnIndex: 0,
                                    endColumnIndex: 1
                                },
                                rule: {
                                    condition: {
                                        type: 'BOOLEAN'
                                    },
                                    inputMessage: '完了チェック',
                                    showCustomUi: true
                                }
                            }
                        },
                        {
                            updateCells: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: rowNumber - 1,
                                    endRowIndex: rowNumber,
                                    startColumnIndex: 0,
                                    endColumnIndex: 1
                                },
                                rows: [{
                                    values: [{
                                        userEnteredValue: {
                                            boolValue: false
                                        }
                                    }]
                                }],
                                fields: 'userEnteredValue'
                            }
                        }
                    ]
                }
            });
            
            console.log(`行${rowNumber}にチェックボックスを設定しました`);
            
        } catch (error) {
            console.error('チェックボックス設定エラー:', error);
        }
    }

    // スプレッドシートの変更を監視してフォーマット適用
    async setupConditionalFormatting() {
        try {
            // 既存の条件付き書式をクリアしてから新規作成
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [
                        {
                            addConditionalFormatRule: {
                                rule: {
                                    ranges: [{
                                        sheetId: 0,
                                        startRowIndex: 1, // ヘッダー行をスキップ
                                        endRowIndex: 1000, // 十分な行数
                                        startColumnIndex: 1, // B列から（日時列から）
                                        endColumnIndex: 4   // D列まで（メモ内容列まで）
                                    }],
                                    booleanRule: {
                                        condition: {
                                            type: 'CUSTOM_FORMULA',
                                            values: [{
                                                userEnteredValue: '=$A2=TRUE'
                                            }]
                                        },
                                        format: {
                                            textFormat: {
                                                strikethrough: true,
                                                foregroundColor: {
                                                    red: 0.6,
                                                    green: 0.6,
                                                    blue: 0.6
                                                }
                                            }
                                        }
                                    }
                                },
                                index: 0
                            }
                        }
                    ]
                }
            });
            
            console.log('条件付き書式（取り消し線）を設定しました');
            
        } catch (error) {
            console.error('条件付き書式設定エラー:', error);
        }
    }

    // スプレッドシートリンクを表示
    showSpreadsheetLink() {
        const linkContainer = document.getElementById('spreadsheetLink');
        if (linkContainer) {
            const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`;
            linkContainer.innerHTML = `
                <a href="${spreadsheetUrl}" target="_blank" class="btn btn-outline">
                    📊 スプレッドシートを開く
                </a>
            `;
            linkContainer.classList.remove('hidden');
        }
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