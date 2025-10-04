# QUANTUM-EXPENSE-LEDGER
odoo hackathon 
QEL Enterprise Solution V8: Multi-Layered Expense Management
This project, the Quantum Expense Ledger (QEL), is a complete solution built to solve the complexities of modern enterprise expense reporting. It implements all features outlined in the problem statement, focusing on a simplified user experience despite a highly complex core logic engine.

Core Implemented Features
DLT (Distributed Ledger Technology) Simulation: All transactions are logged to an immutable audit trail (_expenses_dlt) to ensure transparency, anti-fraud compliance, and integrity, with a unique transaction hash for every submission.

Intelligent Approval Workflow:

Multi-Level & Sequential: Expenses follow a predefined sequence (Manager → Finance → Director/CFO).

Conditional Rules: Supports advanced approval logic including Percentage Rules (e.g., 60% of Finance team must approve) and Hybrid Rules (e.g., 60% of team OR a specific role like CFO approves).

AI Risk Scoring & Policy Compliance: A background engine calculates a Risk Score for every claim based on historical behavior and policy violations, which determines the final flow steps (e.g., Critical risk claims are automatically escalated).

Role-Based Portals: Dedicated portals for Employee (Submission/Tracking), Manager/Finance (Approvals/Audit), and Admin (User Management/Override Authority).

Admin Override: The dedicated Admin portal is the only role with the authority to force-set the final status of any expense, with the action and reason permanently logged to the DLT audit trail.

OCR Simulation & Currency Conversion: Expense data is automatically populated (simulated) from a receipt scan, and amounts are converted to the base currency (USD) for approval visibility.
