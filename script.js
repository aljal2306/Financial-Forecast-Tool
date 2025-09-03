document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const forecastMonthsSelect = document.getElementById('forecast-months');
    const monthlyInputsContainer = document.getElementById('monthly-inputs-container');
    const generateBtn = document.getElementById('generate-forecast-btn');
    const forecastOutput = document.getElementById('forecast-output');
    const forecastTableContainer = document.getElementById('forecast-table-container');

    let balanceChart = null; 

    // --- INITIALIZATION & EVENTS ---
    generateMonthlyInputs(); 
    forecastMonthsSelect.addEventListener('change', generateMonthlyInputs);
    generateBtn.addEventListener('click', runForecast);
    
    monthlyInputsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-expense-btn')) {
            const monthIndex = event.target.dataset.month;
            addOptionalExpenseField(monthIndex);
        }
    });

    /**
     * Generates the ACCORDION input cards for each month.
     */
    function generateMonthlyInputs() {
        const monthsCount = parseInt(forecastMonthsSelect.value);
        monthlyInputsContainer.innerHTML = '';
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonth = new Date().getMonth();

        for (let i = 0; i < monthsCount; i++) {
            const monthIndex = (currentMonth + i) % 12;
            const year = new Date().getFullYear() + Math.floor((currentMonth + i) / 12);
            const monthName = `${monthNames[monthIndex]} ${year}`;
            
            // Use <details> and <summary> for a native accordion
            const accordion = document.createElement('details');
            accordion.className = 'monthly-accordion';
            // Open the first month by default
            if (i === 0) {
                accordion.open = true;
            }

            accordion.innerHTML = `
                <summary>${monthName}</summary>
                <div class="monthly-accordion-content">
                    <div class="input-group">
                        <label for="income-${i}">Take-Home Pay ($)</label>
                        <input type="number" id="income-${i}" class="monthly-income" placeholder="e.g., 3500">
                    </div>
                    <div class="optional-expenses-container" id="optional-expenses-${i}">
                        <label>Optional Additional Expenses</label>
                    </div>
                    <button type="button" class="utility-btn add-expense-btn" data-month="${i}">+ Add Expense</button>
                </div>
            `;
            monthlyInputsContainer.appendChild(accordion);
        }
    }

    function addOptionalExpenseField(monthIndex) {
        const container = document.getElementById(`optional-expenses-${monthIndex}`);
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-item';
        expenseItem.innerHTML = `<input type="text" class="expense-description" placeholder="Expense Name"><input type="number" class="expense-amount" placeholder="Amount">`;
        container.appendChild(expenseItem);
    }

    function runForecast() {
        const currentBalance = parseFloat(document.getElementById('current-balance').value) || 0;
        const coreBudget = parseFloat(document.getElementById('core-budget').value) || 0;
        let runningBalance = currentBalance;
        let forecastData = [];
        
        const monthlyAccordions = monthlyInputsContainer.querySelectorAll('.monthly-accordion');
        monthlyAccordions.forEach((accordion, i) => {
            const monthName = accordion.querySelector('summary').textContent;
            const income = parseFloat(accordion.querySelector(`#income-${i}`).value) || 0;
            
            let totalOptionalExpenses = 0;
            accordion.querySelectorAll('.expense-amount').forEach(input => {
                totalOptionalExpenses += parseFloat(input.value) || 0;
            });
            
            const totalExpenses = coreBudget + totalOptionalExpenses;
            const startOfMonthBalance = runningBalance;
            const endOfMonthBalance = startOfMonthBalance + income - totalExpenses;

            forecastData.push({
                month: monthName,
                start: startOfMonthBalance,
                income: income,
                expenses: totalExpenses,
                end: endOfMonthBalance,
            });
            runningBalance = endOfMonthBalance;
        });

        const totalIncome = forecastData.reduce((sum, month) => sum + month.income, 0);
        const totalExpenses = forecastData.reduce((sum, month) => sum + month.expenses, 0);
        const netFlow = totalIncome - totalExpenses;
        let lowestBalance = forecastData.length > 0 ? forecastData.reduce((lowest, month) => month.end < lowest.value ? { value: month.end, month: month.month } : lowest, { value: forecastData[0].end, month: forecastData[0].month }) : { value: 0, month: '' };
        
        displayForecast(forecastData, { totalIncome, totalExpenses, netFlow, lowestBalance });
    }

    function displayForecast(data, summaryData) {
        displaySummaryDashboard(summaryData);
        displayForecastTable(data);
        displayForecastChart(data); 
        forecastOutput.classList.remove('hidden');
    }

    function displaySummaryDashboard(summary) {
        document.getElementById('summary-total-income').textContent = formatCurrency(summary.totalIncome);
        document.getElementById('summary-total-expenses').textContent = formatCurrency(summary.totalExpenses);
        const netFlowEl = document.getElementById('summary-net-flow');
        netFlowEl.textContent = formatCurrency(summary.netFlow);
        netFlowEl.className = 'summary-value';
        netFlowEl.classList.add(summary.netFlow >= 0 ? 'positive' : 'negative');
        document.getElementById('summary-lowest-balance').textContent = formatCurrency(summary.lowestBalance.value);
        document.getElementById('summary-lowest-month').textContent = `in ${summary.lowestBalance.month}`;
    }

    /**
     * Displays forecast in a table, ADDING data-label for mobile view.
     */
    function displayForecastTable(data) {
        forecastTableContainer.innerHTML = '';
        if (data.length === 0) return;
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Start Balance</th>
                    <th>Income (+)</th>
                    <th>Total Expenses (-)</th>
                    <th>End Balance</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(monthData => `
                    <tr>
                        <td data-label="Month">${monthData.month}</td>
                        <td data-label="Start Balance" class="currency ${monthData.start < 0 ? 'negative' : ''}">${formatCurrency(monthData.start)}</td>
                        <td data-label="Income (+)" class="currency">${formatCurrency(monthData.income)}</td>
                        <td data-label="Total Expenses (-)" class="currency">${formatCurrency(monthData.expenses)}</td>
                        <td data-label="End Balance" class="currency ${monthData.end < 0 ? 'negative' : ''}">${formatCurrency(monthData.end)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        forecastTableContainer.appendChild(table);
    }

    function displayForecastChart(data) {
        const ctx = document.getElementById('balance-chart').getContext('2d');
        if (balanceChart) {
            balanceChart.destroy();
        }
        balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.month.split(' ')[0]), // Use short month names for mobile
                datasets: [{
                    label: 'Ending Bank Balance',
                    data: data.map(d => d.end),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: data.map(d => d.end < 0 ? '#e74c3c' : 'rgba(54, 162, 235, 1)'),
                    pointRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { ticks: { callback: value => '$' + (value/1000) + 'k' } } }, // Abbreviate y-axis labels
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