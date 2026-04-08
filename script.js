/**
 * DailySpend - 完整功能整合版 (包含：記錄、統計、固定使費設定、分頁、刪除)
 */

// --- 1. 資料初始化 ---
let expenses = JSON.parse(localStorage.getItem('myExpenses')) || [];
let recurringSettings = JSON.parse(localStorage.getItem('recurringSettings')) || [
    { id: 'rec_1', day: 1, amount: 5000, category: '預設房租', lastBilledMonth: '' }
];

// --- 2. 獲取 DOM 元素 ---
const expenseForm = document.getElementById('expenseForm');
const recurringForm = document.getElementById('recurringForm');
const expenseList = document.getElementById('expenseList');
const recurringList = document.getElementById('recurringList');
const monthTotalEl = document.getElementById('monthTotal');
const weekTotalEl = document.getElementById('weekTotal');
const recurringTotalEl = document.getElementById('recurringTotal');

// --- 3. 啟動 App ---
function init() {
    setDefaultDateTime(); // 設定預設日期時間
    setDefaultSearchDates(); // 初始化搜尋日期
    checkRecurringExpenses(); 
    renderUI();
    updateNoteSuggestions(); // 初始化時加載備注歷史
}

function setDefaultDateTime() {
    const now = new Date();
    // 設定日期預設值 (YYYY-MM-DD)
    document.getElementById('inputDate').value = now.toLocaleDateString('sv-SE');
    // 設定時間預設值 (HH:MM)
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('inputTime').value = `${hours}:${minutes}`;
}

// --- 4. 自動處理固定使費邏輯 ---
function checkRecurringExpenses() {
    const now = new Date();
    const today = now.getDate();
    const thisMonth = now.toISOString().slice(0, 7);

    let hasUpdate = false;

    recurringSettings.forEach(setting => {
        if (today >= setting.day && setting.lastBilledMonth !== thisMonth) {
            const autoExpense = {
                id: 'auto_' + Date.now() + Math.random(),
                amount: parseFloat(setting.amount),
                category: setting.category + " (固定)",
                date: `${thisMonth}-${String(setting.day).padStart(2, '0')}`
            };
            expenses.push(autoExpense);
            setting.lastBilledMonth = thisMonth;
            hasUpdate = true;
        }
    });

    if (hasUpdate) saveData();
}

// --- 5. 事件監聽 (新增使費) ---
if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('amount').value);
        const note = document.getElementById('note').value;
        
        // 2. 抓取使用者在輸入格選取的日期和時間
        const selectedDate = document.getElementById('inputDate').value;
        const selectedTime = document.getElementById('inputTime').value;
    
        const newExpense = {
            id: Date.now().toString(),
            amount: amount,
            category: document.getElementById('category').options[document.getElementById('category').selectedIndex].text,
            note: note,
            date: selectedDate, // 使用選取的日期
            time: selectedTime  // 使用選取的時間
        };
    
        expenses.push(newExpense);
        saveData();
        renderUI();

        updateNoteSuggestions(); // 新增後立刻更新建議清單
        
        // 提交後重置表單，並重新設定一次預設時間（防止下一筆記錄時間太舊）
        expenseForm.reset();
        setDefaultDateTime();
    });
}

// --- 6. 事件監聽 (新增固定使費設定) ---
if (recurringForm) {
    recurringForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newSetting = {
            id: 'rec_' + Date.now(),
            category: document.getElementById('recName').value,
            day: parseInt(document.getElementById('recDay').value),
            amount: parseFloat(document.getElementById('recAmount').value),
            lastBilledMonth: ''
        };
        recurringSettings.push(newSetting);
        saveData();
        renderRecurringList();
        updateTotals();
        recurringForm.reset();
    });
}

// --- 7. 分頁切換功能 ---
window.switchTab = function(tab) {
    const views = {
        'list': document.getElementById('listView'),
        'search': document.getElementById('searchView'),
        'settings': document.getElementById('settingsView')
    };
    const tabs = document.querySelectorAll('.tab-link');

    // 隱藏所有，顯示目標
    Object.values(views).forEach(v => v.style.display = 'none');
    views[tab].style.display = 'block';

    // 處理 Tab 高亮
    tabs.forEach(t => t.classList.remove('active'));
    if(tab === 'list') tabs[0].classList.add('active');
    if(tab === 'search') tabs[1].classList.add('active');
    if(tab === 'settings') tabs[2].classList.add('active');

    if(tab === 'list') renderUI();
};

// --- 8. 介面渲染與統計 ---
// 更新統計與日期的功能
function updateTotals() {
    const now = new Date();
    
    // --- 1. 處理今日日期顯示 ---
    const year = now.getFullYear().toString().slice(-2); // 取得 "26"
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dayName = weekDays[now.getDay()];
    
    const dateString = `${year}年${month}月${date}日 (${dayName})`;
    document.getElementById('todayDate').innerText = dateString;

    // --- 2. 處理本月標籤 (4月1日至今) ---
    document.getElementById('monthLabel').innerText = `本月支出 (${month}月1日至今)`;

    // --- 3. 計算各項金額 ---
    const thisMonthStr = now.toISOString().slice(0, 7); // "2026-04"
    const todayStr = now.toLocaleDateString('sv-SE');  // "2026-04-08"

    // 今日總支出
    const todayTotal = expenses
        .filter(exp => exp.date === todayStr)
        .reduce((sum, exp) => sum + exp.amount, 0);

    // 本月總支出
    const monthTotal = expenses
        .filter(exp => exp.date.startsWith(thisMonthStr))
        .reduce((sum, exp) => sum + exp.amount, 0);

    // --- 4. 渲染到介面 ---
    document.getElementById('todayTotal').innerText = `$${todayTotal.toLocaleString()}`;
    document.getElementById('monthTotal').innerText = `$${monthTotal.toLocaleString()}`;
}

function renderUI() {
    if (!expenseList) return;
    expenseList.innerHTML = '';
    if (expenses.length === 0) {
        expenseList.innerHTML = '<li class="empty-msg">今日未有使費，繼續保持！</li>';
    } else {
        const recentExpenses = [...expenses].reverse().slice(0, 15);
        
        recentExpenses.forEach(item => {
            const li = document.createElement('li');
            li.className = 'expense-item';
            
            // 處理備注顯示格式：如果沒備注就不顯示橫槓
            const displayCategory = item.note ? `${item.category} - ${item.note}` : item.category;
            
            li.innerHTML = `
                <div class="item-info">
                    <div style="font-weight: bold;">${displayCategory}</div>
                    <small style="color: #888;">${item.date} (${item.time})</small>
                </div>
                <div class="item-amount">
                    <strong style="color: #e74c3c;">-$${item.amount.toLocaleString()}</strong>
                    <button class="delete-btn" onclick="deleteExpense('${item.id}')">✕</button>
                </div>
            `;
            expenseList.appendChild(li);
        });
    }
    updateTotals();
}

function renderRecurringList() {
    if (!recurringList) return;
    recurringList.innerHTML = recurringSettings.map(setting => `
        <li class="expense-item">
            <div>
                <strong>${setting.category}</strong>
                <small style="display:block; color:#888;">每月 ${setting.day} 號 | $${setting.amount.toLocaleString()}</small>
            </div>
            <button class="delete-btn" onclick="deleteRecurring('${setting.id}')">✕</button>
        </li>
    `).join('');
}

// --- 9. 刪除功能 ---
window.deleteExpense = function(id) {
    if (confirm('確定要刪除這筆記錄嗎？')) {
        expenses = expenses.filter(exp => exp.id != id);
        saveData();
        renderUI();
    }
};

window.deleteRecurring = function(id) {
    if (confirm('確定要移除此固定支出嗎？')) {
        recurringSettings = recurringSettings.filter(s => s.id !== id);
        saveData();
        renderRecurringList();
        updateTotals();
    }
};

// --- 10. 資料持久化 ---
function saveData() {
    localStorage.setItem('myExpenses', JSON.stringify(expenses));
    localStorage.setItem('recurringSettings', JSON.stringify(recurringSettings));
}

// --- 11. 更新建議清單的函數 ---
function updateNoteSuggestions() {
    const datalist = document.getElementById('noteHistory');
    
    // 1. 從所有使費記錄中提取備注，過濾掉空的，並移除重複項
    const previousNotes = [...new Set(expenses
        .map(exp => exp.note)
        .filter(note => note && note.trim() !== "")
    )];

    // 2. 將備注轉化為 <option> 標籤
    datalist.innerHTML = previousNotes
        .map(note => `<option value="${note}">`)
        .join('');
}

// --- 11. 取得上個月日期
function setDefaultSearchDates() {
    const now = new Date();
    // 取得上個月的 1 號
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // 取得上個月的最後一天 (本月第 0 天即上月最後一天)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    document.getElementById('searchFrom').value = firstDayLastMonth.toLocaleDateString('sv-SE');
    document.getElementById('searchTo').value = lastDayLastMonth.toLocaleDateString('sv-SE');
}

// --- 12. 搜尋指定期間記錄
window.performSearch = function() {
    const from = document.getElementById('searchFrom').value;
    const to = document.getElementById('searchTo').value;
    const cate = document.getElementById('searchCategory').value; // 取得選中的類別名稱
    const noteKey = document.getElementById('searchNote').value.trim().toLowerCase();
    
    const resultList = document.getElementById('searchResultList');
    const summaryEl = document.getElementById('searchResultSummary');

    if (!from || !to) return alert("請選擇日期範圍");

    const filtered = expenses.filter(exp => {
        // A. 日期篩選
        const matchDate = exp.date >= from && exp.date <= to;
        
        // B. 類別篩選 (關鍵修復點)
        // 確保 exp.category 的內容（如 "飲食"）與 cate 的值完全匹配
        const matchCate = (cate === 'all') || (exp.category === cate);
        
        // C. 備注篩選
        const expNote = (exp.note || "").toLowerCase();
        const matchNote = noteKey === "" || expNote.includes(noteKey);

        return matchDate && matchCate && matchNote;
    });

    // 排序
    filtered.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

    // 渲染統計
    const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
    summaryEl.innerText = `搜尋結果：${filtered.length} 筆，總計：$${total.toLocaleString()}`;

    // 渲染清單
    resultList.innerHTML = filtered.map(item => `
        <li class="expense-item">
            <div class="item-info">
                <div style="font-weight: bold;">${item.note ? item.category + ' - ' + item.note : item.category}</div>
                <small style="color: #888;">${item.date} (${item.time})</small>
            </div>
            <div class="item-amount">
                <strong style="color: #e74c3c;">-$${item.amount.toLocaleString()}</strong>
                <button class="delete-btn" onclick="deleteExpense('${item.id}'); performSearch();">✕</button>
            </div>
        </li>
    `).join('') || '<li class="empty-msg">找不到符合條件的記錄</li>';
};


// 啟動！
init();
