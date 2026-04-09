// --- 1. 全域變數與初始化 ---
let expenses = JSON.parse(localStorage.getItem('myExpenses')) || [];
let recurringExpenses = JSON.parse(localStorage.getItem('recurringExpenses')) || [];
let displayLimit = 15;

const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');

// 程式啟動
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    updateHeaderDate();      // 更新頂部日期顯示
    setDefaultDateTime();    // 設定新增記錄的預設時間
    setDefaultSearchDates(); // 設定搜尋頁面的預設範圍
    checkRecurringExpenses(); // 檢查並執行每月固定扣款
    updateNoteSuggestions(); // 載入備註歷史建議
    renderUI();              // 繪製主頁列表
}

// --- 2. 介面渲染與分頁邏輯 ---

// 更新頂部日期與本月總計
function updateHeaderDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('currentDateDisplay').innerText = now.toLocaleDateString('zh-TW', options);
    
    // 更新月份標籤 (如: 4月總支出)
    document.getElementById('monthLabel').innerText = `${now.getMonth() + 1}月總支出`;
}

// 主頁面渲染
function renderUI() {
    if (!expenseList) return;
    expenseList.innerHTML = '';
    
    const sorted = [...expenses].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    if (sorted.length === 0) {
        expenseList.innerHTML = '<li class="empty-msg">目前沒有記錄</li>';
    } else {
        sorted.slice(0, displayLimit).forEach(item => {
            const li = document.createElement('li');
            li.className = 'expense-item';
            li.innerHTML = `
                <div class="item-info">
                    <div style="font-weight: bold;">${item.note ? item.category + ' - ' + item.note : item.category}</div>
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
    document.getElementById('limitDisplay').innerText = `目前顯示限額: ${displayLimit}`;
}

// 切換分頁
window.switchTab = function(tab) {
    const views = {
        'list': document.getElementById('listView'),
        'search': document.getElementById('searchView'),
        'settings': document.getElementById('settingsView')
    };
    const tabs = document.querySelectorAll('.tab-link');

    Object.values(views).forEach(v => v.style.display = 'none');
    views[tab].style.display = 'block';

    tabs.forEach(t => t.classList.remove('active'));
    if (tab === 'list') {
        tabs[0].classList.add('active');
        resetDisplay();
    } else if (tab === 'search') {
        tabs[1].classList.add('active');
        performSearch();
    } else if (tab === 'settings') {
        tabs[2].classList.add('active');
        renderRecurringList();
    }
};

// 重置主頁顯示
function resetDisplay() {
    displayLimit = 15;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderUI();
}

// --- 3. 新增與刪除記錄 ---

// 處理新增記錄提交
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const note = document.getElementById('note').value;
    const date = document.getElementById('inputDate').value;
    const time = document.getElementById('inputTime').value;

    const newExpense = {
        id: Date.now().toString(),
        amount,
        category,
        note,
        date,
        time
    };

    expenses.push(newExpense);
    saveData();
    updateNoteSuggestions();
    resetDisplay();
    
    expenseForm.reset();
    setDefaultDateTime();
});

window.deleteExpense = function(id) {
    if (confirm('確定要刪除此記錄嗎？')) {
        expenses = expenses.filter(e => e.id !== id);
        saveData();
        renderUI();
    }
};

function saveData() {
    localStorage.setItem('myExpenses', JSON.stringify(expenses));
}

// --- 4. 搜尋功能邏輯 ---

function setDefaultSearchDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    document.getElementById('searchFrom').value = firstDay.toLocaleDateString('sv-SE');
    document.getElementById('searchTo').value = lastDay.toLocaleDateString('sv-SE');
}

window.performSearch = function() {
    const from = document.getElementById('searchFrom').value;
    const to = document.getElementById('searchTo').value;
    const cate = document.getElementById('searchCategory').value;
    const noteKey = document.getElementById('searchNote').value.trim().toLowerCase();
    
    const resultList = document.getElementById('searchResultList');
    const summaryEl = document.getElementById('searchResultSummary');

    const filtered = expenses.filter(exp => {
        const matchDate = exp.date >= from && exp.date <= to;
        const matchCate = (cate === 'all') || (exp.category === cate);
        const matchNote = noteKey === "" || (exp.note || "").toLowerCase().includes(noteKey);
        return matchDate && matchCate && matchNote;
    }).sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

    const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
    summaryEl.innerText = `搜尋結果：${filtered.length} 筆，總計：$${total.toLocaleString()}`;

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

// --- 5. 固定支出管理 ---

const recurringForm = document.getElementById('recurringForm');
if (recurringForm) {
    recurringForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newRec = {
            amount: parseFloat(document.getElementById('recAmount').value),
            category: document.getElementById('recCategory').value,
            day: parseInt(document.getElementById('recDay').value),
            note: document.getElementById('recNote').value,
            lastProcessedMonth: "" // 用於防止同月重複扣款
        };
        recurringExpenses.push(newRec);
        localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
        recurringForm.reset();
        renderRecurringList();
    });
}

function renderRecurringList() {
    const list = document.getElementById('recurringList');
    list.innerHTML = recurringExpenses.map((item, index) => `
        <li class="expense-item">
            <div class="item-info">
                <div style="font-weight: bold;">每月 ${item.day} 號 - ${item.category}</div>
                <small>${item.note || ''}</small>
            </div>
            <div class="item-amount">
                <strong>$${item.amount}</strong>
                <button class="delete-btn" onclick="deleteRecurring(${index})">✕</button>
            </div>
        </li>
    `).join('') || '<li class="empty-msg">目前沒有固定支出</li>';
}

window.deleteRecurring = function(index) {
    recurringExpenses.splice(index, 1);
    localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
    renderRecurringList();
};

function checkRecurringExpenses() {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${now.getMonth() + 1}`;
    let changed = false;

    recurringExpenses.forEach(rec => {
        // 如果今天日期 >= 扣款日，且本月尚未扣款
        if (now.getDate() >= rec.day && rec.lastProcessedMonth !== currentMonthStr) {
            const newExp = {
                id: "rec-" + Date.now() + Math.random(),
                amount: rec.amount,
                category: rec.category,
                note: "[固定支出] " + (rec.note || ""),
                date: now.toLocaleDateString('sv-SE'),
                time: "08:00"
            };
            expenses.push(newExp);
            rec.lastProcessedMonth = currentMonthStr;
            changed = true;
        }
    });

    if (changed) {
        saveData();
        localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
    }
}

// --- 6. 輔助功能 ---

function setDefaultDateTime() {
    const now = new Date();
    document.getElementById('inputDate').value = now.toLocaleDateString('sv-SE');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('inputTime').value = `${hours}:${minutes}`;
}

function updateNoteSuggestions() {
    const datalist = document.getElementById('noteHistory');
    const notes = [...new Set(expenses.map(e => e.note).filter(n => n))];
    datalist.innerHTML = notes.map(n => `<option value="${n}">`).join('');
}

function updateTotals() {
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE');
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const todayTotal = expenses
        .filter(e => e.date === todayStr)
        .reduce((sum, e) => sum + e.amount, 0);

    const monthTotal = expenses
        .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + e.amount, 0);

    document.getElementById('todayTotal').innerText = `$${todayTotal.toLocaleString()}`;
    document.getElementById('monthTotal').innerText = `$${monthTotal.toLocaleString()}`;
}

// 無限捲動監聽
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
        if (displayLimit < expenses.length) {
            displayLimit += 15;
            renderUI();
        }
    }
});
