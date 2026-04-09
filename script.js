// --- 1. 全域變數與初始化 ---
let expenses = JSON.parse(localStorage.getItem('myExpenses')) || [];
let recurringExpenses = JSON.parse(localStorage.getItem('recurringExpenses')) || [];
let displayLimit = 15;

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    updateHeaderDate();      // 更新頂部日期顯示
    setDefaultDateTime();    // 設定新增記錄的預設時間
    setDefaultSearchDates(); // 設定搜尋頁面的預設範圍
    checkRecurringExpenses(); // 檢查並執行每月固定支出
    updateNoteSuggestions(); // 載入備註歷史建議
    renderUI();              // 繪製主頁列表
}

// --- 2. 介面渲染與分頁邏輯 ---

function updateHeaderDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('currentDateDisplay').innerText = now.toLocaleDateString('zh-TW', options);
    document.getElementById('monthLabel').innerText = `${now.getMonth() + 1}月總支出`;
}

// 主頁面渲染 (最近記錄)
function renderUI() {
    const expenseList = document.getElementById('expenseList');
    if (!expenseList) return;
    expenseList.innerHTML = '';
    
    // 按時間倒序排列
    const sorted = [...expenses].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    if (sorted.length === 0) {
        expenseList.innerHTML = '<li class="empty-msg">目前沒有記錄</li>';
    } else {
        sorted.slice(0, displayLimit).forEach(item => {
            const li = document.createElement('li');
            li.className = 'expense-item';
            li.innerHTML = `
                <div class="item-info">
                    <div style="font-weight: bold; color: var(--primary);">${item.note ? item.category + ' - ' + item.note : item.category}</div>
                    <small style="color: #64748b;">${item.date} (${item.time})</small>
                </div>
                <div class="item-amount">
                    <strong style="color: var(--primary); font-size: 1.1rem;">-$${item.amount.toLocaleString()}</strong>
                    <button class="delete-btn" onclick="deleteExpense('${item.id}')">✕</button>
                </div>
            `;
            expenseList.appendChild(li);
        });
    }
    updateTotals();
    document.getElementById('limitDisplay').innerText = `目前顯示限額: ${displayLimit}`;
}

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
        performSearch(); // 進入時自動執行一次搜尋
    } else if (tab === 'settings') {
        tabs[2].classList.add('active');
        renderRecurringList();
    }
};

function resetDisplay() {
    displayLimit = 15;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderUI();
}

// --- 3. 核心數據處理 ---

const expenseForm = document.getElementById('expenseForm');
if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const note = document.getElementById('note').value;
        const date = document.getElementById('inputDate').value;
        const time = document.getElementById('inputTime').value;

        const newExpense = { id: Date.now().toString(), amount, category, note, date, time };
        expenses.push(newExpense);
        saveData();
        updateNoteSuggestions();
        resetDisplay();
        expenseForm.reset();
        setDefaultDateTime();
    });
}

window.deleteExpense = function(id) {
    if (confirm('確定要刪除此記錄嗎？')) {
        expenses = expenses.filter(e => e.id !== id);
        saveData();
        renderUI();
        // 如果人在搜尋頁面，同步更新搜尋結果
        if (document.getElementById('searchView').style.display !== 'none') performSearch();
    }
};

function saveData() {
    localStorage.setItem('myExpenses', JSON.stringify(expenses));
}

// --- 4. 搜尋記錄與批量刪除 ---

window.performSearch = function() {
    const from = document.getElementById('searchFrom').value;
    const to = document.getElementById('searchTo').value;
    const cate = document.getElementById('searchCategory').value;
    const noteKey = document.getElementById('searchNote').value.trim().toLowerCase();
    
    const resultList = document.getElementById('searchResultList');
    const summaryEl = document.getElementById('searchResultSummary');
    const deleteBtnContainer = document.getElementById('deleteAllContainer');

    const filtered = expenses.filter(exp => {
        const matchDate = exp.date >= from && exp.date <= to;
        const matchCate = (cate === 'all') || (exp.category === cate);
        const matchNote = noteKey === "" || (exp.note || "").toLowerCase().includes(noteKey);
        return matchDate && matchCate && matchNote;
    }).sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

    const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
    summaryEl.innerText = `搜尋結果：${filtered.length} 筆，總計：$${total.toLocaleString()}`;

    // 控制「刪除全部結果」按鈕顯示
    deleteBtnContainer.style.display = filtered.length > 0 ? 'block' : 'none';

    resultList.innerHTML = filtered.map(item => `
        <li class="expense-item">
            <div class="item-info">
                <div style="font-weight: bold; color: var(--primary);">${item.note ? item.category + ' - ' + item.note : item.category}</div>
                <small style="color: #64748b;">${item.date} (${item.time})</small>
            </div>
            <div class="item-amount">
                <strong style="color: var(--primary);">-$${item.amount.toLocaleString()}</strong>
                <button class="delete-btn" onclick="deleteExpense('${item.id}')">✕</button>
            </div>
        </li>
    `).join('') || '<li class="empty-msg">找不到符合條件的記錄</li>';
};

window.deleteAllSearchResults = function() {
    const from = document.getElementById('searchFrom').value;
    const to = document.getElementById('searchTo').value;
    const cate = document.getElementById('searchCategory').value;
    const noteKey = document.getElementById('searchNote').value.trim().toLowerCase();

    if (!confirm(`警告：確定要刪除目前搜尋出的這 ${expenses.filter(exp => {
        const matchDate = exp.date >= from && exp.date <= to;
        const matchCate = (cate === 'all') || (exp.category === cate);
        const matchNote = noteKey === "" || (exp.note || "").toLowerCase().includes(noteKey);
        return matchDate && matchCate && matchNote;
    }).length} 筆記錄嗎？此操作無法恢復。`)) return;

    expenses = expenses.filter(exp => {
        const matchDate = exp.date >= from && exp.date <= to;
        const matchCate = (cate === 'all') || (exp.category === cate);
        const matchNote = noteKey === "" || (exp.note || "").toLowerCase().includes(noteKey);
        return !(matchDate && matchCate && matchNote);
    });

    saveData();
    performSearch();
    renderUI();
    alert("已成功刪除符合搜尋條件的所有記錄");
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
            lastProcessedMonth: "" 
        };
        recurringExpenses.push(newRec);
        localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
        recurringForm.reset();
        renderRecurringList();
    });
}

function renderRecurringList() {
    const list = document.getElementById('recurringList');
    if (!list) return;
    list.innerHTML = recurringExpenses.map((item, index) => `
        <li class="expense-item" style="border-left-color: #27ae60;">
            <div class="item-info">
                <div style="font-weight: bold; color: #27ae60;">每月 ${item.day} 號 - ${item.category}</div>
                <small>${item.note || '無備註'}</small>
            </div>
            <div class="item-amount">
                <strong>$${item.amount.toLocaleString()}</strong>
                <button class="delete-btn" onclick="deleteRecurring(${index})">✕</button>
            </div>
        </li>
    `).join('') || '<li class="empty-msg">目前沒有固定支出</li>';
}

window.deleteRecurring = function(index) {
    if (confirm('確定要取消這項固定支出設定嗎？')) {
        recurringExpenses.splice(index, 1);
        localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
        renderRecurringList();
    }
};

function checkRecurringExpenses() {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${now.getMonth() + 1}`;
    let changed = false;

    recurringExpenses.forEach(rec => {
        if (now.getDate() >= rec.day && rec.lastProcessedMonth !== currentMonthStr) {
            expenses.push({
                id: "rec-" + Date.now() + Math.random(),
                amount: rec.amount,
                category: rec.category,
                note: "[固定支出] " + (rec.note || ""),
                date: now.toLocaleDateString('sv-SE'),
                time: "08:00"
            });
            rec.lastProcessedMonth = currentMonthStr;
            changed = true;
        }
    });

    if (changed) {
        saveData();
        localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
    }
}

// --- 6. 輔助工具 ---

function setDefaultDateTime() {
    const now = new Date();
    document.getElementById('inputDate').value = now.toLocaleDateString('sv-SE');
    document.getElementById('inputTime').value = now.toTimeString().slice(0, 5);
}

function setDefaultSearchDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    document.getElementById('searchFrom').value = firstDay.toLocaleDateString('sv-SE');
    document.getElementById('searchTo').value = lastDay.toLocaleDateString('sv-SE');
}

function updateNoteSuggestions() {
    const datalist = document.getElementById('noteHistory');
    const notes = [...new Set(expenses.map(e => e.note).filter(n => n))];
    datalist.innerHTML = notes.map(n => `<option value="${n}">`).join('');
}

function updateTotals() {
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE');
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const todayTotal = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);
    const monthTotal = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
    }).reduce((s, e) => s + e.amount, 0);

    document.getElementById('todayTotal').innerText = `$${todayTotal.toLocaleString()}`;
    document.getElementById('monthTotal').innerText = `$${monthTotal.toLocaleString()}`;
}

window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
        if (displayLimit < expenses.length && document.getElementById('listView').style.display !== 'none') {
            displayLimit += 15;
            renderUI();
        }
    }
});
