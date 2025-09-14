document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let project = null;
    let balanceChart = null;

    // --- DOM ELEMENTS ---
    const forecastMonthsSelect = document.getElementById('forecast-months');
    const monthlyInputsContainer = document.getElementById('monthly-inputs-container');
    const generateBtn = document.getElementById('generate-forecast-btn');
    const addMonthBtn = document.getElementById('add-month-btn');
    const forecastOutput = document.getElementById('forecast-output');
    const projectDisplayContainer = document.getElementById('project-display-container');
    const basePayInput = document.getElementById('base-pay');
    const applyBasePayBtn = document.getElementById('apply-base-pay-btn');
    const printReportBtn = document.getElementById('print-report-btn');
    const projectModal = document.getElementById('project-modal');
    const addProjectBtn = document.getElementById('add-project-btn');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const addProjectItemBtn = document.getElementById('add-project-item-btn');
    const saveProjectBtn = document.getElementById('save-project-btn');
    const projectItemsContainer = document.getElementById('project-items-container');

    // --- INITIALIZATION & EVENTS ---
    generateMonthlyInputs();
    forecastMonthsSelect.addEventListener('change', generateMonthlyInputs);
    addMonthBtn.addEventListener('click', addMonth);
    generateBtn.addEventListener('click', runForecast);
    addProjectBtn.addEventListener('click', () => projectModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => projectModal.classList.add('hidden'));
    printReportBtn.addEventListener('click', () => window.print());
    
    applyBasePayBtn.addEventListener('click', () => {
        const basePay = basePayInput.value;
        if (basePay && parseFloat(basePay) > 0) {
            document.querySelectorAll('.monthly-income').forEach(input => input.value = basePay);
        }
    });

    addProjectItemBtn.addEventListener('click', addProjectItemRow);
    projectItemsContainer.addEventListener('input', updateProjectTotal);
    saveProjectBtn.addEventListener('click', saveProject);
    
    projectDisplayContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-project-btn')) {
            project = null;
            renderProjectDisplay();
        }
    });

    monthlyInputsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-expense-btn')) {
            addOptionalExpenseField(event.target.dataset.month);
        }
    });

    // =================================================================
    // --- MONTHLY INPUTS & PROJECT FUNCTIONS ---
    // =================================================================

    function createMonthInputCard(monthIndex) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonth = new Date().getMonth();
        const year = new Date().getFullYear() + Math.floor((currentMonth + monthIndex) / 12);
        const monthName = `${monthNames[(currentMonth + monthIndex) % 12]} ${year}`;

        const accordion = document.createElement('details');
        accordion.className = 'monthly-accordion';
        accordion.innerHTML = `
            <summary>${monthName}</summary>
            <div class="monthly-accordion-content">
                <div class="input-group">
                    <label for="income-${monthIndex}">Take-Home Pay ($)</label>
                    <input type="number" id="income-${monthIndex}" class="monthly-income" placeholder="e.g., 3500">
                </div>
                <div class="optional-expenses-container" id="optional-expenses-${monthIndex}">
                    <label>Optional Additional Expenses</label>
                </div>
                <button type="button" class="utility-btn add-expense-btn" data-month="${monthIndex}">+ Add Expense</button>
            </div>`;
        return accordion;
    }

    function generateMonthlyInputs() {
        const monthsCount = parseInt(forecastMonthsSelect.value);
        monthlyInputsContainer.innerHTML = '';
        for (let i = 0; i < monthsCount; i++) {
            const newCard = createMonthInputCard(i);
            if (i === 0) {
                newCard.open = true;
            }
            monthlyInputsContainer.appendChild(newCard);
        }
    }

    function addMonth() {
        const currentMonthCount = monthlyInputsContainer.children.length;
        if (currentMonthCount >= 24) {
            return; 
        }
        const newCard = createMonthInputCard(currentMonthCount);
        newCard.open = true;
        monthlyInputsContainer.appendChild(newCard);
        forecastMonthsSelect.value = currentMonthCount + 1;
    }

    function addOptionalExpenseField(monthIndex) {
        const container = document.getElementById(`optional-expenses-${monthIndex}`);
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-item';
        expenseItem.innerHTML = `<input type="text" class="expense-description" placeholder="Expense Name"><input type="number" class="expense-amount" placeholder="Amount">`;
        container.appendChild(expenseItem);
    }

    function addProjectItemRow() {
        const row = document.createElement('div');
        row.className = 'project-item-row';
        row.innerHTML = `<input type="text" class="project-item-name" placeholder="Item Name"><input type="number" class="project-item-cost" placeholder="Cost">`;
        projectItemsContainer.appendChild(row);
    }

    function updateProjectTotal() {
        let total = 0;
        projectItemsContainer.querySelectorAll('.project-item-cost').forEach(input => total += parseFloat(input.value) || 0);
        document.getElementById('project-total-cost').textContent = formatCurrency(total);
    }

    function saveProject() {
        const name = document.getElementById('project-name').value || 'Untitled Project';
        let totalCost = 0;
        const items = [];
        projectItemsContainer.querySelectorAll('.project-item-row').forEach(row => {
            const itemName = row.querySelector('.project-item-name').value;
            const itemCost = parseFloat(row.querySelector('.project-item-cost').value) || 0;
            if (itemName && itemCost > 0) {
                items.push({ name: itemName, cost: itemCost });
                totalCost += itemCost;
            }
        });
        if (totalCost > 0) {
            project = { name, totalCost, items };
            renderProjectDisplay();
            projectModal.classList.add('hidden');
        } else {
            alert('Please add at least one item with a cost to your project.');
        }
    }

    function renderProjectDisplay() {
        projectDisplayContainer.innerHTML = '';
        if (project) {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `<div><h3>🎯 ${project.name}</h3><span class="project-cost">${formatCurrency(project.totalCost)}</span></div><button class="remove-project-btn">&times;</button>`;
            projectDisplayContainer.appendChild(card);
        }
    }

    // =================================================================
    // --- CORE FORECASTING & DISPLAY ---
    // =================================================================

    function runForecast() {
        const currentBalance = parseFloat(document.getElementById('current-balance').value) || 0;
        const coreBudget = parseFloat(document.getElementById('core-budget').value) || 0;
        const safetyBalance = parseFloat(document.getElementById('safety-balance').value) || 0;
        let runningBalance = currentBalance;
        let forecastData = [];

        monthlyInputsContainer.querySelectorAll('.monthly-accordion').forEach((accordion, i) => {
            const monthName = accordion.querySelector('summary').textContent;
            const income = parseFloat(accordion.querySelector(`#income-${i}`).value) || 0;
            
            let optionalExpensesTotal = 0;
            const expenseItems = [];
            accordion.querySelectorAll('.expense-item').forEach(item => {
                const name = item.querySelector('.expense-description').value;
                const amount = parseFloat(item.querySelector('.expense-amount').value) || 0;
                if (name && amount > 0) {
                    expenseItems.push({ name, amount });
                    optionalExpensesTotal += amount;
                }
            });
            
            const totalExpenses = coreBudget + optionalExpensesTotal;
            const endOfMonthBalance = runningBalance + income - totalExpenses;

            forecastData.push({ month: monthName, end: endOfMonthBalance, income, optionalExpenses: optionalExpensesTotal, expenseItems });
            runningBalance = endOfMonthBalance;
        });

        if (project) {
            let affordableMonth = null;
            for (const monthData of forecastData) {
                if ((monthData.end - project.totalCost) >= safetyBalance) {
                    affordableMonth = monthData.month;
                    break;
                }
            }
            displayProjectResult(affordableMonth);
        } else {
            document.getElementById('project-results-container').innerHTML = '';
        }

        const totalIncome = forecastData.reduce((sum, m) => sum + m.income, 0);
        const totalOptionalExpenses = forecastData.reduce((sum, m) => sum + m.optionalExpenses, 0);
        const totalCoreExpenses = (coreBudget * forecastData.length);
        const netFlow = totalIncome - (totalCoreExpenses + totalOptionalExpenses);
        let lowestBalance = forecastData.length ? forecastData.reduce((l, m) => m.end < l.value ? { value: m.end, month: m.month } : l, { value: forecastData[0].end, month: forecastData[0].month }) : { value: 0, month: '' };
        
        const summaryData = { totalIncome, totalCoreExpenses, totalOptionalExpenses, netFlow, lowestBalance };
        displayForecast(forecastData, summaryData);
    }
    
    function displayProjectResult(affordableMonth) {
        const container = document.getElementById('project-results-container');
        container.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'project-result-card';
        if (affordableMonth) {
            card.innerHTML = `<h3>Congratulations! You can afford your project:</h3><div class="affordable-date">${affordableMonth}</div>`;
        } else {
            card.innerHTML = `<h3>Goal Not Yet Reachable</h3><div class="not-affordable">You cannot afford this project within the forecast period based on your safety balance.</div>`;
        }
        container.appendChild(card);
    }
    
    function displayForecast(data, summaryData) {
        displaySummaryDashboard(summaryData);
        displayForecastTable(data);
        displayForecastChart(data);
        forecastOutput.classList.remove('hidden');
    }

    function displaySummaryDashboard(summary) {
        const container = document.getElementById('summary-dashboard');
        container.innerHTML = `
            <div class="summary-item"><span class="summary-label">Total Income</span><span class="summary-value" id="summary-total-income">${formatCurrency(summary.totalIncome)}</span></div>
            <div class="summary-item"><span class="summary-label">Total Core Expenses</span><span class="summary-value" id="summary-core-expenses">${formatCurrency(summary.totalCoreExpenses)}</span></div>
            <div class="summary-item"><span class="summary-label">Total Optional Expenses</span><span class="summary-value" id="summary-optional-expenses">${formatCurrency(summary.totalOptionalExpenses)}</span></div>
            <div class="summary-item"><span class="summary-label">Net Cash Flow</span><span class="summary-value ${summary.netFlow >= 0 ? 'positive' : 'negative'}" id="summary-net-flow">${formatCurrency(summary.netFlow)}</span></div>
            <div class="summary-item"><span class="summary-label">Lowest Balance</span><span class="summary-value" id="summary-lowest-balance">${formatCurrency(summary.lowestBalance.value)}</span><span class="summary-meta" id="summary-lowest-month">in ${summary.lowestBalance.month}</span></div>
        `;
    }

    function displayForecastTable(data) {
        const container = document.getElementById('forecast-table-container');
        container.innerHTML = '';
        if (data.length === 0) return;

        data.forEach(monthData => {
            const card = document.createElement('div');
            card.className = 'month-report-card';

            let expensesHtml = '<p style="padding: 0 15px 15px; margin:0; color: #6c757d;">No optional expenses this month.</p>';
            if (monthData.expenseItems.length > 0) {
                expensesHtml = `
                    <div class="month-report-details">
                        <h5>Optional Expenses</h5>
                        <ul class="expense-list">
                            ${monthData.expenseItems.map(item => `
                                <li class="expense-list-item">
                                    <span>${item.name}</span>
                                    <span>${formatCurrency(item.amount)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>`;
            }

            card.innerHTML = `
                <div class="month-report-header">
                    <h4>${monthData.month}</h4>
                    <span class="month-report-balance ${monthData.end < 0 ? 'negative' : ''}">${formatCurrency(monthData.end)}</span>
                </div>
                ${expensesHtml}
            `;
            container.appendChild(card);
        });
    }

    function displayForecastChart(data) {
        const ctx = document.getElementById('balance-chart').getContext('2d');
        if (balanceChart) balanceChart.destroy();
        balanceChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels: data.map(d => d.month.split(' ')[0]), 
                datasets: [{ 
                    label: 'Ending Bank Balance', 
                    data: data.map(d => d.end), 
                    borderColor: 'rgba(54, 162, 235, 1)', 
                    backgroundColor: 'rgba(54, 162, 235, 0.2)', 
                    fill: true, 
                    tension: 0.1, 
                    pointBackgroundColor: data.map(d => d.end < 0 ? '#e74c3c' : 'rgba(54, 162, 235, 1)'), 
                    pointRadius: 5 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { y: { ticks: { callback: value => '$' + (value / 1000) + 'k' } } }, 
                plugins: { 
                    tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}` } }, 
                    legend: { display: false } 
                } 
            }
        });
    }
    
    function formatCurrency(value) {
        return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
});
