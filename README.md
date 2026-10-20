# 宏國地政｜易丞地政付費專業諮詢入口

正式公開網址： https://homegoestate.github.io/line-member-booking/

## 原有網址及流程保留
- 原首頁、\`service.html\`、\`tools.html\` 及 LINE 官方帳號 \`@604gpqef\` 不改網址。
- 第 1 步選擇服務、第 2 步選擇顧問、第 3 步選擇希望時間、第 4 步由客戶自行跳至 LINE **再按送出**。
- 付款、銀行核帳、正式 Google 行事曆寫入都保留人工核對關卡；公開網站不接收客戶密碼、卡號或金流資料。

## 這次修正的已確認原因
舊首頁將 8/17、8/18 與 11:00、13:30、14:30 **寫死在 HTML**；沒有任何 Google Calendar API 呼叫。畫面雖稱「依目前 Google 行事曆產生的介面預覽」，實際並未連線。

## 新版安全模式
- 無可用 API：只接受「由專人協調」希望日期／偏好時段，不提供任何假空檔。
- API 錯誤、逾時、未設顧問服務時段、回傳資料過舊：一律改為人工協調。
- Google API 成功：顯示至多 14 天、伺服器以最新 busy 覆核過的候選時段；時段**不保留**。
- 最後送出 LINE 前，再查詢一次原時段是否仍可選；發生衝突或斷線時阻擋即時時段並轉人工協調。
- 顧問「由團隊安排」尚未指定是哪一位地政士：只提供人工協調，不任意挪用他人行事曆。

## 唯讀預約 API（另一個可審查 PR）
API 程式位於既有 Vercel 專案 \`homegoestate/nexus-line-bot\` 的 \`api/consult-availability.js\`，**與既有 LINE webhook 分離**。
\`GET /api/consult-availability?advisor=yi-cheng&from=YYYY-MM-DD&days=14\`，只回傳：
\`{ "source":"google-calendar-freebusy", "timezone":"Asia/Taipei", "checkedAt":"...", "advisor":"yi-cheng", "slots":[{"start":"...+08:00","end":"...+08:00"}] }\`
伺服器對 Google Calendar 使用最低限度 **freebusy 唯讀權限**，不回傳事件名稱、電話或個資。CORS 僅允許本站。查詢失敗時 HTTP 503，不得沿用前次過期結果。

### 上線前必要設定（不得把密鑰放進公開 GitHub）
在 Vercel \`nexus-line-bot\` 專案的正式環境，由管理者配置：
1. \`HG_BOOKING_GOOGLE_CLIENT_EMAIL\` — 新建的 Google Cloud Service Account 地址。
2. \`HG_BOOKING_GOOGLE_PRIVATE_KEY\` — 私鑰（僅放 Vercel encrypted environment variable；不得貼聊天或儲存庫）。
3. \`HG_BOOKING_YICHENG_BUSY_CALENDARS\` — 確認後的楊翊晟全部封鎖行事曆 ID，以逗號分隔。應盤點主要行事曆、對外預約與封鎖、已收款諮詢；不可僅查空的「已收款」行事曆。
4. \`HG_BOOKING_YICHENG_HOURS_JSON\` — **由顧問核准**的每週可服務時段。範例結構 \`{"1":[["10:00","12:00"]],"2":[["14:00","17:00"]]}\`，星期 0=日、1=一、…6=六。**範例不可直接視為核定營業時段**。
5. 楊明宗地政士若要開放自選時段：另外配置 \`HG_BOOKING_MINGZONG_BUSY_CALENDARS\` 和 \`HG_BOOKING_MINGZONG_HOURS_JSON\`。未確認主體與行事曆前**不可沿用翊晟資料**。
6. 選填：\`HG_BOOKING_SESSION_MINUTES\` 預設 60；\`HG_BOOKING_GRID_MINUTES\` 預設 30；\`HG_BOOKING_NOTICE_HOURS\` 預設 24；\`HG_BOOKING_BUFFER_MINUTES\` 預設 0。最終須由管理者確認時長與前後緩衝。
7. 在 Google Calendar「設定與共用」中，僅對服務帳戶個別授權 **查看忙碌／空閒（隱藏詳細資訊）**，不能公開整本行事曆；權限需要對查詢清單上的**每一本**行事曆生效。
8. 先從受限測試環境以人工挑選的忙碌／空閒時段做比對，包含全日活動、跨月、取消、多人忙碌重疊、已收款衝突與時區 Asia/Taipei。
9. 確認 API 返回來源、查詢時間、成功與失敗行為後，才在 \`booking-config.js\` 設定核驗過的 HTTPS API 正式網址；不得寫入金鑰。
10. 再進行手機／桌機與 LINE 跳轉的人工驗收，核准兩邊 PR 後才能正式發布。

## 已知限制與人工閘門
- Google Calendar free/busy 是**排除衝突**，不能單憑行事曆的空白時間判定顧問願意接受預約。必須另有經核准的服務時段。
- 候選時段無鎖定機制；即使送出前檢查成功，仍必須在人工收款與入曆前再次確認，避免競態與重複預約。
- 本次沒有建置收費或自動正式入曆，也沒有修改已存在的 Google Calendar 事件。
- 若沒有完成上述憑證與時段核准，請維持 \`HOMEGO_BOOKING_API=""\`，讓前端如實顯示由專人確認，不能宣稱已完成即時串接。
