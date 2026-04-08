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
    checkRecurringExpenses(); 
    renderUI();              
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
        const note = document.getElementById('note').value; // 抓取備注
        const now = new Date();
        
        // 取得時間格式 14:30
        const timeString = now.getHours().toString().padStart(2, '0') + ":" + 
                           now.getMinutes().toString().padStart(2, '0');
    
        const newExpense = {
            id: Date.now().toString(),
            amount: amount,
            category: document.getElementById('category').options[document.getElementById('category').selectedIndex].text,
            note: note, // 儲存備注
            date: now.toLocaleDateString('sv-SE'), // YYYY-MM-DD
            time: timeString // 儲存時間
        };
    
        expenses.push(newExpense);
        saveData();
        renderUI();
        expenseForm.reset();
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
    const listView = document.getElementById('listView');
    const settingsView = document.getElementById('settingsView');
    const tabs = document.querySelectorAll('.tab-link');

    if (tab === 'list') {
        listView.style.display = 'block';
        settingsView.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
        renderUI();
    } else {
        listView.style.display = 'none';
        settingsView.style.display = 'block';
        tabs[1].classList.add('active');
        tabs[0].classList.remove('active');
        renderRecurringList();
    }
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

// 啟動！
init();
