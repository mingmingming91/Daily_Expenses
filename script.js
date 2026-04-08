/**
 * DailySpend - 核心邏輯整合版
 */

// --- 1. 資料初始化 ---
// 從 LocalStorage 讀取資料，若無資料則初始化為空陣列
let expenses = JSON.parse(localStorage.getItem('myExpenses')) || [];
let recurringSettings = JSON.parse(localStorage.getItem('recurringSettings')) || [
    // 預設一個例子：每月 1 號扣租金 $5000
    { id: 'rec_1', day: 1, amount: 5000, category: '租金', lastBilledMonth: '' }
];

// --- 2. 獲取 DOM 元素 ---
const expenseForm = document.getElementById('expenseForm');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const expenseList = document.getElementById('expenseList');
const monthTotalEl = document.getElementById('monthTotal');
const weekTotalEl = document.getElementById('weekTotal');
const recurringTotalEl = document.getElementById('recurringTotal');

// --- 3. 啟動 App ---
function init() {
    checkRecurringExpenses(); // 檢查並自動處理每月固定使費
    renderUI();              // 渲染介面
}

// --- 4. 自動處理固定使費 ---
function checkRecurringExpenses() {
    const now = new Date();
    const today = now.getDate();
    const thisMonth = now.toISOString().slice(0, 7); // 格式 "2024-04"

    let hasUpdate = false;

    recurringSettings.forEach(setting => {
        // 邏輯：如果今天日期 >= 設定日期，且該項目在本月尚未入帳
        if (today >= setting.day && setting.lastBilledMonth !== thisMonth) {
            const autoExpense = {
                id: 'auto_' + Date.now() + Math.random(),
                amount: parseFloat(setting.amount),
                category: setting.category + " (固定)",
                date: `${thisMonth}-${String(setting.day).padStart(2, '0')}`
            };
            
            expenses.push(autoExpense);
            setting.lastBilledMonth = thisMonth; // 標記本月已扣
            hasUpdate = true;
        }
    });

    if (hasUpdate) {
        saveData();
    }
}

// --- 5. 新增使費事件 ---
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) return;

    const newExpense = {
        id: Date.now(),
        amount: amount,
        category: categoryInput.options[categoryInput.selectedIndex].text,
        date: new Date().toLocaleDateString('sv-SE') // 取得 YYYY-MM-DD 本地日期
    };

    expenses.push(newExpense);
    saveData();
    renderUI();
    expenseForm.reset(); // 清空表格
});

// --- 6. 統計與結算邏輯 ---
function updateTotals() {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    
    // A. 每月結算 (本月 1 號至今)
    const monthTotal = expenses
        .filter(exp => exp.date.startsWith(thisMonth))
        .reduce((sum, exp) => sum + exp.amount, 0);

    // B. 每周結算 (過去 7 天)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const weekTotal = expenses
        .filter(exp => new Date(exp.date) >= sevenDaysAgo)
        .reduce((sum, exp) => sum + exp.amount, 0);

    // C. 固定使費總和 (設定中的預算)
    const recurringSum = recurringSettings.reduce((sum, rec) => sum + rec.amount, 0);

    // 更新到介面
    monthTotalEl.innerText = `$${monthTotal.toLocaleString()}`;
    weekTotalEl.innerText = `$${weekTotal.toLocaleString()}`;
    recurringTotalEl.innerText = `$${recurringSum.toLocaleString()}`;
}

// --- 7. 介面渲染 ---
function renderUI() {
    expenseList.innerHTML = '';

    if (expenses.length === 0) {
        expenseList.innerHTML = '<li class="empty-msg">今日未有使費，繼續保持！</li>';
    } else {
        const recentExpenses = [...expenses].reverse().slice(0, 10);
        
        recentExpenses.forEach(item => {
            const li = document.createElement('li');
            li.className = 'expense-item';
            li.innerHTML = `
                <div class="item-info">
                    <div style="font-weight: bold;">${item.category}</div>
                    <small style="color: #888;">${item.date}</small>
                </div>
                <div class="item-amount">
                    <strong style="color: #e74c3c;">-$${item.amount.toLocaleString()}</strong>
                    <button class="delete-btn" onclick="deleteExpense('${item.id}')">✕</button>
                </div>
            `;
            expenseList.appendChild(li);
        }); // 這裡要有 });
    }
    updateTotals();
} // 這裡要有一個 } 閉合 renderUI

// --- 8. 儲存資料到 LocalStorage ---
function saveData() {
    localStorage.setItem('myExpenses', JSON.stringify(expenses));
    localStorage.setItem('recurringSettings', JSON.stringify(recurringSettings));
}


// --- 9. 刪除記錄功能 ---
function deleteExpense(id) {
    // 為了安全，刪除前問一句（如果不想要彈窗可以刪除 if 這行）
    if (confirm('確定要刪除這筆記錄嗎？')) {
        // 過濾掉該 ID 的項目 (注意：ID 可能是數字或字串，所以用 != 而不是 !==)
        expenses = expenses.filter(exp => exp.id != id);
        
        saveData(); // 儲存到 LocalStorage
        renderUI(); // 重新整理畫面
    }
}

// 10. 處理固定支出表單提交
const recurringForm = document.getElementById('recurringForm');
if (recurringForm) {
    recurringForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newSetting = {
            id: 'rec_' + Date.now(),
            category: document.getElementById('recName').value,
            day: parseInt(document.getElementById('recDay').value),
            amount: parseFloat(document.getElementById('recAmount').value),
            lastBilledMonth: '' // 新增時預設本月未扣
        };
        recurringSettings.push(newSetting);
        saveData();
        renderRecurringList();
        recurringForm.reset();
        updateTotals(); // 更新 Dashboard 上的固定支出總額
    });
}

// 11. 渲染設定列表
function renderRecurringList() {
    const listEl = document.getElementById('recurringList');
    listEl.innerHTML = recurringSettings.map(setting => `
        <li class="expense-item">
            <div>
                <strong>${setting.category}</strong>
                <small style="display:block; color:#888;">每月 ${setting.day} 號 | $${setting.amount}</small>
            </div>
            <button class="delete-btn" onclick="deleteRecurring('${setting.id}')">✕</button>
        </li>
    `).join('');
}

// 12. 刪除固定支出設定
window.deleteRecurring = function(id) {
    if (confirm('刪除後將不再自動扣款，確定嗎？')) {
        recurringSettings = recurringSettings.filter(s => s.id !== id);
        saveData();
        renderRecurringList();
        updateTotals();
    }
};


// 執行初始化
init();
