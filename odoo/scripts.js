// scripts.js - QUANTUM EXPENSE LEDGER (QEL) - CORE LOGIC ENGINE V4

// --- Global Constants and Real-Time Data Stores ---
const COMPANY_NAME = "Quantum Dynamics Inc.";
const COMPANY_BASE_CURRENCY = "USD";
const SYSTEM_CONFIG = {
    STANDARD_BUSINESS_HOURS: { start: 9, end: 18 }, // 9am to 6pm
    MAX_SIMULTANEOUS_LOCATIONS_THRESHOLD: 1, 
    FINANCE_TEAM_ROLES: ["FINANCE", "CFO", "ADMIN_AUDIT"],
    DLT_HEALTH: {
        MAX_LATENCY_MS: 50,
        AVG_BLOCK_SIZE_KB: 4096 
    },
    SUPPORTED_ROLES: ["ADMIN_AUDIT", "MANAGER", "EMPLOYEE", "CFO", "FINANCE"]
};


// Base Exchange Rates for FX Simulation
const REAL_TIME_FX_BASES = {
    "EUR_TO_USD_BASE": 1.17425,
    "GBP_TO_USD_BASE": 1.34770 
};

// Simulated Real-Time FX Data (updated by interval)
let REAL_TIME_FX_RATES = {
    "EUR_TO_USD": REAL_TIME_FX_BASES.EUR_TO_USD_BASE,
    "GBP_TO_USD": REAL_TIME_FX_BASES.GBP_TO_USD_BASE
};

// Company Financial Data (Influences Liquidity Check - Feature 4)
const COMPANY_FINANCIALS = {
    cash_on_hand: 500000.00,
    hourly_settlement_limit: 50000.00 
};

// --- DATA ACCESS LAYER SIMULATION (Database Functions) ---

const _initial_users = {
    1001: { id: 1001, role: "ADMIN_AUDIT", name: "Alex Chen (QEL Admin)", redirect: "approver_hub.html" },
    1002: { id: 1002, role: "MANAGER", name: "Ben Smith (Manager)", redirect: "approver_hub.html" },
    1003: { id: 1003, role: "EMPLOYEE", name: "Clara Johnson (Employee)", manager_id: 1002, redirect: "employee_portal.html" },
    1004: { id: 1004, role: "CFO", name: "Dana Lee (CFO)", manager_id: 1001, redirect: "approver_hub.html" }, 
    1005: { id: 1005, role: "FINANCE", name: "Eve Wong (Finance)", manager_id: 1001, redirect: "approver_hub.html" }, 
    1006: { id: 1006, role: "FINANCE", name: "Finley Gray (Finance)", manager_id: 1001, redirect: "approver_hub.html" }, 
};

// Load or initialize data from localStorage
let _users_db = JSON.parse(localStorage.getItem('_users_db_v4')) || _initial_users;
let _expenses_db = JSON.parse(localStorage.getItem('_expenses_db_v4')) || [
    { 
        id: 90001, 
        employee_id: 1003, 
        amount: 50.00,
        currency: "USD",
        amount_usd: 50.00, 
        category: "Meals", 
        location: "New York", 
        description: "Lunch for internal team meeting.", 
        start_time: new Date(Date.now() - 30 * 24 * 3600000).toISOString(), 
        fraud_risk_level: "LOW", 
        fraud_risk_score: 10,
        zkp_status: "COMPLIANT", 
        status: "SETTLED_INSTANT", 
        llm_compliance_report: {policy_match: "HIGH", llm_note: "Standard lunch expense. Compliant.", sentiment_score: 80, model_version: "GPT-4.1-Compliance-E"}, 
        approval_flow: [], 
        current_sequence: 1 
    },
];

function _save_to_db(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

const DB_API = {
    /** * The Database Interface for Read/Write */
    get_user_by_id: (id) => _users_db[id],
    get_all_users: () => _users_db,
    
    get_all_expenses: () => _expenses_db,
    get_expense_by_id: (id) => _expenses_db.find(e => e.id === id),
    update_expense: (updatedExpense) => {
        const index = _expenses_db.findIndex(e => e.id === updatedExpense.id);
        if (index > -1) {
            _expenses_db[index] = updatedExpense;
            _save_to_db('_expenses_db_v4', _expenses_db);
            return updatedExpense;
        }
        return null;
    },
    update_user: (userId, newData) => {
        if (_users_db[userId]) {
            _users_db[userId] = { ..._users_db[userId], ...newData };
            _save_to_db('_users_db_v4', _users_db);
            return _users_db[userId];
        }
        return null;
    }
};

const SIMULATED_USERS = DB_API.get_all_users();
// --- END DATA ACCESS LAYER SIMULATION ---


function updateFxRates() {
    /** Simulates real-time volatility. **/
    const random_volatility_eur = (Math.random() * 0.002 - 0.001); 
    const random_volatility_gbp = (Math.random() * 0.003 - 0.0015); 
    
    REAL_TIME_FX_RATES.EUR_TO_USD = (REAL_TIME_FX_BASES.EUR_TO_USD_BASE + random_volatility_eur).toFixed(5);
    REAL_TIME_FX_RATES.GBP_TO_USD = (REAL_TIME_FX_BASES.GBP_TO_USD_BASE + random_volatility_gbp).toFixed(5);
    
    if (typeof updateFxDisplay === 'function') {
        updateFxDisplay();
    }
}
setInterval(updateFxRates, 10000); 

function getFxRate(fromCurrency) {
    if (fromCurrency === COMPANY_BASE_CURRENCY) return 1.0;
    if (fromCurrency === 'EUR') return parseFloat(REAL_TIME_FX_RATES.EUR_TO_USD);
    if (fromCurrency === 'GBP') return parseFloat(REAL_TIME_FX_RATES.GBP_TO_USD);
    return 0;
}

// --- FEATURE 8: Dynamic Role and Relationship Management (Admin Only) ---
function api_get_all_users_lite() {
    return Object.values(DB_API.get_all_users()).map(user => ({
        id: user.id,
        name: user.name,
        role: user.role,
        manager_id: user.manager_id
    }));
}

function api_update_user_role(userId, newRole, newManagerId = null) {
    const user = DB_API.get_user_by_id(userId);
    if (!user) return { success: false, message: "User not found." };
    
    const roleMap = {
        "ADMIN_AUDIT": "approver_hub.html", "MANAGER": "approver_hub.html",
        "EMPLOYEE": "employee_portal.html", "CFO": "approver_hub.html",
        "FINANCE": "approver_hub.html"
    };

    const newData = {
        role: newRole,
        redirect: roleMap[newRole]
    };

    if (newRole === "EMPLOYEE" && newManagerId) {
        const manager = DB_API.get_user_by_id(newManagerId);
        if (manager && (manager.role === 'MANAGER' || manager.role === 'ADMIN_AUDIT')) {
             newData.manager_id = parseInt(newManagerId);
        } else {
             return { success: false, message: "Invalid manager ID or role for the new manager." };
        }
    } else if (newRole !== "EMPLOYEE") {
         delete user.manager_id;
         newData.manager_id = undefined;
    }
    
    const updatedUser = DB_API.update_user(userId, newData);
    
    if (updatedUser) {
        return { success: true, user: updatedUser, message: `Role updated to ${newRole}.` };
    }
    return { success: false, message: "Failed to update user in DB." };
}

// --- FEATURE 7: DLT Infrastructure Health Check ---
function api_get_dlt_health_status() {
    const transaction_count = DB_API.get_all_expenses().length;
    const avg_latency = Math.floor(Math.random() * 45) + 5; // 5ms to 50ms

    let status = "OPTIMAL";
    let color = "text-green-400";
    if (avg_latency > SYSTEM_CONFIG.DLT_HEALTH.MAX_LATENCY_MS) {
        status = "DEGRADED_LATENCY";
        color = "text-red-400";
    } else if (transaction_count > 10) {
        status = "HIGH_LOAD";
        color = "text-yellow-400";
    }

    return {
        status: status,
        color: color,
        current_tps: (Math.random() * 100 + 50).toFixed(1), // Transactions per second
        avg_latency_ms: avg_latency,
        active_nodes: 7 + Math.floor(Math.random() * 3),
        block_size_kb: SYSTEM_CONFIG.DLT_HEALTH.AVG_BLOCK_SIZE_KB,
        next_maintenance_days: 14,
        audit_log_hash: `0x${Math.random().toString(16).substring(2, 12).toUpperCase()}`
    };
}


// --- FEATURE 5: LLM-Driven Compliance Recommendation (Generative AI) ---
function api_get_llm_compliance_report(category, description, amount_usd, max_budget_usd) {
    let report = {};
    let sentiment = 0; 
    let policy_match = "HIGH";
    
    description = description.toLowerCase();
    
    if (amount_usd > max_budget_usd * 1.5) { 
        report.compliance_issue = "CRITICAL BUDGET OVERRUN. Exceeds predictive model by >50%. LLM recommends MANDATORY CFO review.";
        policy_match = "LOW";
        sentiment -= 80;
    } else if (amount_usd > max_budget_usd) {
        report.compliance_issue = "Budget Alert. 15% overrun on predictive model. Requires justification.";
        policy_match = "MEDIUM";
        sentiment -= 40;
    }

    if (category === "Meals") {
        if (description.includes("personal") || description.includes("birthday")) {
            report.llm_note = "Keywords 'personal' / 'birthday' suggest non-reimbursable expense. Policy requires business-related context.";
            policy_match = "MEDIUM";
            sentiment -= 30;
        } else if (description.includes("client") && amount_usd > 200) {
            report.llm_note = "High-value client engagement. LLM generated: 'This high-value client meal aligns with Q3 relationship building strategy. APPROVED.'";
            sentiment += 40;
        }
    } else if (category === "Travel") {
        if (description.includes("first class") || description.includes("luxury")) {
            report.compliance_issue = report.compliance_issue || "Potential violation of 'Economy-Only' travel policy. Requires Admin override.";
            policy_match = "LOW";
            sentiment -= 60;
        }
    }
    
    if (!report.llm_note) {
        report.llm_note = "Automated review found no immediate red flags. Standard policy alignment confirmed.";
        sentiment += 10;
    }
    
    report.policy_match = policy_match;
    report.sentiment_score = Math.min(100, Math.max(-100, sentiment));
    report.model_version = "GPT-4.1-Compliance-E";
    
    return report;
}


// --- FEATURE 6: Predictive Budget Model (AI Budget) ---
function api_get_predictive_budget(employeeId, location, category) {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 90));
    
    const userExpenses = DB_API.get_all_expenses().filter(e => 
        e.employee_id === employeeId && 
        e.category === category && 
        new Date(e.start_time) > ninetyDaysAgo
    );
    
    const totalSpend = userExpenses.reduce((sum, e) => sum + e.amount_usd, 0);
    const dailyAverage = userExpenses.length > 0 ? totalSpend / 90 : 0; 

    // Dynamic Cost Indexing
    const cost_multiplier = { 
        "New York": 1.7, "London": 1.45, "Paris": 1.55, "Mysuru": 0.7, 
    }[location] || 1.0;

    const base_budget = (category === "Meals") ? 85.0 : (category === "Travel") ? 350.0 : 180.0;
    const dynamic_budget = base_budget * cost_multiplier;
    
    // Predictive Model: Dynamic Budget + 5x Daily Average + 10% Volatility Buffer
    const predictive_max_spend = dynamic_budget + (dailyAverage * 5) + (dynamic_budget * 0.1); 
    
    const max_spend = parseFloat(predictive_max_spend.toFixed(2));
    
    return { 
        max_spend, 
        currency: COMPANY_BASE_CURRENCY,
        basis_note: `Basis: Dynamic Cost ($${dynamic_budget.toFixed(2)}) + 5x User 90-Day Avg (${(dailyAverage * 5).toFixed(2)})`,
        daily_average: dailyAverage.toFixed(2)
    };
}


// --- FEATURE 1: Time/Geolocation Anomaly Detection (Enhanced Fraud Risk) ---
function api_get_fraud_risk_score(employeeId, amount_usd, category, location, expense_datetime) {
    const expenses = DB_API.get_all_expenses();
    let score = 5; 
    const expenseTime = new Date(expense_datetime);
    const timeHour = expenseTime.getHours();
    
    score += Math.floor(amount_usd / 500) * 4; 

    // Anomaly 1: Outside Business Hours
    if (timeHour < SYSTEM_CONFIG.STANDARD_BUSINESS_HOURS.start || timeHour >= SYSTEM_CONFIG.STANDARD_BUSINESS_HOURS.end) {
        score += 15;
    }

    // Anomaly 2: Rapid/Simultaneous location change
    const recentExpenses = expenses.filter(e => e.employee_id === employeeId && (new Date() - new Date(e.start_time)) < 21600000); 
    
    const distinctLocations = new Set(recentExpenses.map(e => e.location));
    if (!distinctLocations.has(location)) {
        distinctLocations.add(location);
    }
    
    if (distinctLocations.size > SYSTEM_CONFIG.MAX_SIMULTANEOUS_LOCATIONS_THRESHOLD) {
        score += 40; 
    }
    
    score = Math.min(99, score);
    
    let risk_level = "LOW";
    if (score > 35) risk_level = "MEDIUM";
    if (score > 60) risk_level = "HIGH";

    return { score, risk_level, message: `Anomaly risk computed: ${risk_level}` };
}

// Layer A: Semantic Contextualization (LLM Feature)
function api_get_llm_semantic_confidence(category, description) {
    description = description.toLowerCase();
    let score = 95; 

    if (category === "Meals") {
        if (description.includes("flight") || description.includes("train")) score = 40;
    } else if (category === "Travel") {
        if (description.includes("pizza") || description.includes("coffee")) score = 55;
    }
    
    score = Math.floor(Math.random() * 5) + Math.min(100, score);
    
    let confidence_level = "HIGH";
    if (score < 80) confidence_level = "MEDIUM";
    if (score < 60) confidence_level = "LOW";

    return { score, confidence_level };
}


// --- FEATURE 2: Hybrid Conditional Approval Logic (Policy Engine Enhancement) ---
function api_generate_approval_flow(amount_usd, fraud_risk_level, semantic_confidence_level, llm_policy_match, employee_id) {
    const flow = [];
    const employee = DB_API.get_user_by_id(employee_id);
    const allFinanceUsers = Object.values(DB_API.get_all_users()).filter(u => u.role === 'FINANCE' || u.role === 'CFO');
    const requiredFinanceApprovers = Math.ceil(allFinanceUsers.length * 0.6); // 60% rule (4 users * 0.6 = 2.4, so 3 approvers needed)

    // Step 1: Default Manager Approval (Sequential)
    if (employee.manager_id) {
        flow.push({ role: "MANAGER", sequence: 1, type: "SEQUENTIAL", manager_id: employee.manager_id, approver_name: DB_API.get_user_by_id(employee.manager_id)?.name || 'N/A', is_complete: false });
    } else {
        flow.push({ role: "ADMIN_AUDIT", sequence: 1, type: "MANDATORY_ESCALATION", reason: "NO_DIRECT_MANAGER", is_complete: false });
        return flow;
    }
    
    let nextSequence = flow.length + 1;

    // CONDITIONAL RULE 1: HIGH FRAUD RISK or LOW LLM COMPLIANCE
    if (fraud_risk_level === "HIGH" || llm_policy_match === "LOW") {
        flow.push({ role: "ADMIN_AUDIT", sequence: nextSequence, type: "MANDATORY_ESCALATION", reason: "HIGH FRAUD RISK OR LOW POLICY COMPLIANCE", is_complete: false });
        return flow; // High risk short-circuits to Admin
    }
    
    // CONDITIONAL RULE 2: High Value OR Medium LLM Compliance
    if (amount_usd > 1000 || llm_policy_match === "MEDIUM") {
        
        if (amount_usd > 5000) {
             // Implements the Hybrid Rule: CFO Approval OR 60% of Finance team sign-off 
             flow.push({ 
                role: "CFO_OR_FINANCE", 
                sequence: nextSequence, 
                type: "HYBRID_RULE", 
                rule: `CFO Approval OR ${requiredFinanceApprovers} Finance Sign-offs.`,
                approvers_needed: 1, // Only 1 approval from CFO is needed to satisfy this specific *CFO* part of the rule
                hybrid_roles: ["CFO", "ADMIN_AUDIT"], // CFO/Admin can satisfy the specific rule
                approved_by: [],
                is_complete: false 
            });
            nextSequence++;
             // Add the percentage rule as a *separate* concurrent step that must be satisfied to proceed
             flow.push({ 
                role: "FINANCE_TEAM_PERCENTAGE", 
                sequence: nextSequence, 
                type: "PERCENTAGE_RULE", 
                rule: `${requiredFinanceApprovers} of all Finance/CFO members must approve.`,
                approvers_needed: requiredFinanceApprovers, 
                eligible_approvers: allFinanceUsers.map(u => u.id), // Use IDs for tracking
                approved_by: [],
                is_complete: false
            });


        } else if (amount_usd > 1000) {
            flow.push({ role: "FINANCE", sequence: nextSequence, type: "SEQUENTIAL_FINANCE", is_complete: false });
            nextSequence++;
        }
    }
    
    return flow;
}

// --- FEATURE 4: Advanced Liquidity & Settlement Queue ---
function api_check_liquidity_risk(amount_usd) {
    const stats = api_get_settlement_queue_stats();
    
    if (amount_usd > (stats.hourly_limit_remaining * 0.5)) {
        return { risk: "MEDIUM", message: `Large expense ($${amount_usd}) consuming >50% of the remaining hourly settlement limit. Settlement may be delayed by 1-2 hours.` };
    }
    
    if (stats.total_pending_queue > (COMPANY_FINANCIALS.cash_on_hand * 0.10)) {
         return { risk: "HIGH", message: "System-wide liquidity queue is HIGH. Settlement delayed until next 4-hour batch cycle (High-Risk). Requires CFO or Admin sign-off." };
    }
    
    return { risk: "LOW", message: "Instant liquidity available via ZKP-secured channel. Standard T+0 Settlement." };
}

function api_get_settlement_queue_stats() {
    const expenses = DB_API.get_all_expenses();
    const settled_recently = expenses.filter(e => e.status.includes('SETTLED') && (new Date() - new Date(e.start_time)) < 3600000); 

    const total_settled_last_hour = settled_recently.reduce((sum, e) => sum + e.amount_usd, 0);
    const total_pending_queue = expenses
        .filter(e => e.status.includes('PENDING'))
        .reduce((sum, e) => sum + e.amount_usd, 0);
    
    return {
        total_settled_last_hour: total_settled_last_hour,
        total_pending_queue: total_pending_queue,
        hourly_limit: COMPANY_FINANCIALS.hourly_settlement_limit,
        hourly_limit_remaining: Math.max(0, COMPANY_FINANCIALS.hourly_settlement_limit - total_settled_last_hour),
    };
}


// --- The Ledger (DLT/Smart Contract) and Submission (Uses DB_API) ---
function api_submit_expense(data) {
    const expense_id = Math.floor(Math.random() * 89999) + 10000;
    
    const expense_datetime = `${data.date}T${data.time}:00`;

    // 1. Predictive Budget (Feature 6)
    const budget_data = api_get_predictive_budget(data.employee_id, data.location, data.category);
    
    // 2. Core AI Checks (Feature 1 & Semantic)
    const fraud_data = api_get_fraud_risk_score(data.employee_id, data.amount_usd, data.category, data.location, expense_datetime);
    const semantic_data = api_get_llm_semantic_confidence(data.category, data.description);
    
    // 3. Generative LLM Report (Feature 5)
    const llm_report = api_get_llm_compliance_report(data.category, data.description, data.amount_usd, budget_data.max_spend);

    // 4. ZKP Proof Generation (Feature ZKP)
    const zkp_proof = api_generate_zkp_proof(data.amount_usd, budget_data.max_spend);

    data.fraud_risk_score = fraud_data.score;
    data.fraud_risk_level = fraud_data.risk_level;
    data.semantic_confidence_score = semantic_data.score;
    data.semantic_confidence_level = semantic_data.confidence_level;
    data.llm_compliance_report = llm_report; 
    
    data.approval_flow = api_generate_approval_flow(data.amount_usd, fraud_data.risk_level, semantic_data.confidence_level, llm_report.policy_match, data.employee_id);
    
    const dlt_record = {
        id: expense_id,
        ...data,
        dlt_transaction_hash: zkp_proof.proof_hash,
        current_sequence: 1, 
        status: `PENDING_${data.approval_flow[0].role.split('_')[0]}`,
        zkp_status: zkp_proof.status,
        start_time: new Date().toISOString(),
        expense_time: expense_datetime 
    };

    _expenses_db.push(dlt_record);
    _save_to_db('_expenses_db_v4', _expenses_db);
    return dlt_record;
}


function api_process_approval(expense_id, approver_role, approver_id, comment, action) {
    let expense = DB_API.get_expense_by_id(expense_id);
    if (!expense) return { status: "ERROR", message: "Expense not found." };
    
    // Find all steps in the current sequence that the approver is eligible for
    const eligibleStepsInSequence = expense.approval_flow.filter(s => 
        s.sequence === expense.current_sequence && 
        (s.role.split('_')[0] === approver_role || s.hybrid_roles?.includes(approver_role) || s.role === 'FINANCE_TEAM_PERCENTAGE')
    );
    
    if (eligibleStepsInSequence.length === 0) {
        return { status: "ERROR", message: "Approval sequence mismatch or invalid role for this step." };
    }
    
    if (action === 'REJECT') {
        expense.status = `REJECTED_BY_${approver_role}`;
        expense.rejection_comment = comment;
        DB_API.update_expense(expense);
        return { status: "SUCCESS", new_status: expense.status };
    }

    let allStepsInSequenceComplete = true;

    eligibleStepsInSequence.forEach(step => {
        // Prevent double counting of approvals from the same user ID if applicable
        if (step.approved_by && !step.approved_by.includes(approver_id)) {
            step.approved_by.push(approver_id);
        }

        if (step.type === 'SEQUENTIAL' || step.type === 'MANDATORY_ESCALATION' || step.type === 'SEQUENTIAL_FINANCE') {
            step.is_complete = true;
        } else if (step.type === 'HYBRID_RULE') {
             // Hybrid Rule: If a CFO/Admin approves, the HYBRID_RULE step is complete
             if (step.hybrid_roles.includes(approver_role)) {
                step.is_complete = true;
             }
             // NOTE: The PERCENTAGE_RULE is a separate step that must also be completed.
        } else if (step.type === 'PERCENTAGE_RULE') {
            // Check if the required number of unique approvals is met
            if (step.approved_by.length >= step.approvers_needed) {
                step.is_complete = true;
            } else {
                step.is_complete = false;
            }
        }
    });

    // Check if ALL steps in the current sequence are complete
    expense.approval_flow
        .filter(s => s.sequence === expense.current_sequence)
        .forEach(step => {
            if (!step.is_complete) {
                allStepsInSequenceComplete = false;
            }
        });

    if (!allStepsInSequenceComplete) {
         DB_API.update_expense(expense);
         return { 
             status: "PENDING_HYBRID_APPROVAL", 
             new_status: `Approval recorded by ${approver_role}. Waiting for remaining approvals in sequence ${expense.current_sequence}.` 
         };
    }
    
    // If all steps in the current sequence are complete, advance sequence
    expense.current_sequence += 1;
    
    // Determine next step status
    const next_step = expense.approval_flow.find(s => s.sequence === expense.current_sequence);

    if (next_step) {
        // Find the role of the next step
        const next_role_base = next_step.role.split('_')[0]; 
        expense.status = `PENDING_${next_role_base}`;
    } else {
        // Approval flow is complete. Now check ZKP and Liquidity.
        if (expense.zkp_status !== "COMPLIANT") {
             expense.status = "PENDING_COMPLIANCE_REVIEW"; // Needs Admin/CFO review for non-compliance
        } else {
            const liquidity = api_check_liquidity_risk(expense.amount_usd);
            if (liquidity.risk === "LOW") {
                expense.status = "SETTLED_INSTANT";
            } else {
                expense.status = "PENDING_LIQUIDITY_QUEUE"; // Needs Finance/CFO review for liquidity risk
            }
        }
    }

    DB_API.update_expense(expense);
    return { status: "SUCCESS", new_status: expense.status };
}


// --- FEATURE 3: Admin Override (The Ultimate Power) ---
function api_admin_override_status(expense_id, new_status, override_reason) {
     let expense = DB_API.get_expense_by_id(expense_id);
     if (!expense) return { status: "ERROR", message: "Expense not found." };
     
     expense.status = `${new_status}_OVERRIDE`;
     expense.override_time = new Date().toISOString();
     expense.override_reason = override_reason || "Admin forced status change.";
     
     // Reset sequence if settling or rejecting
     if (new_status.includes('SETTLED') || new_status.includes('REJECTED')) {
        expense.current_sequence = expense.approval_flow.length + 1;
     } else {
        // If overriding to PENDING, force it to the first step of the flow.
        expense.current_sequence = 1;
        expense.status = `PENDING_MANAGER_OVERRIDE`
     }

     DB_API.update_expense(expense);
     return { status: "SUCCESS", new_status: expense.status };
}


// --- Utility Functions: ZKP (Zero-Knowledge Proof) ---
function api_generate_zkp_proof(amount_usd, max_budget) {
    // ZKP ensures the expense amount is compliant without revealing the exact amount or budget to third-party auditors.
    const is_compliant = amount_usd <= max_budget * 1.05; // 5% grace
    return {
        proof_hash: `0x${Math.random().toString(16).substring(2, 12).toUpperCase()}`,
        status: is_compliant ? "COMPLIANT" : "NON_COMPLIANT"
    };
}

// Linux Tool Integration (for approver_hub.html - Audit Tab)
function api_audit_dlt_ledger(keyword, field="description") {
    const expenses = DB_API.get_all_expenses();
    const keywordLower = keyword.toLowerCase();
    const results = expenses.filter(e => e[field] && e[field].toString().toLowerCase().includes(keywordLower));

    const execution_time_ms = Math.floor(Math.random() * 5) + 1; 

    return {
        query: `grep -i "${keyword}" DLT_LEDGER.log | awk '{print $1, $5}'`, 
        search_field: field,
        results_count: results.length,
        execution_time_ms: execution_time_ms,
        matching_expenses: results.map(e => ({
            id: e.id,
            employee_name: DB_API.get_user_by_id(e.employee_id).name,
            amount_usd: e.amount_usd,
            status: e.status
        })),
        audit_note: `High-speed text search executed via simulated Linux Audit Node. Found ${results.length} matches in ${execution_time_ms}ms.`
    };
}