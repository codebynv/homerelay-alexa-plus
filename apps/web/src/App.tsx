import { useEffect, useState } from "react";
import {
  getPantry,
  getMembers,
  getPreferences,
  getActionLog,
  createPlan,
  executePlan,
  checkHealth,
  type PantryItem,
  type Member,
  type Plan,
  type ExecuteResult,
  type ActionLogEntry,
} from "./api";

function Badge({ children }: { children: string }) {
  return <span className="badge">{children}</span>;
}

function PantryCard({ items }: { items: PantryItem[] }) {
  if (!items.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🥫</div>
        <p>Pantry is empty</p>
      </div>
    );
  }
  return (
    <>
      {items.map((item) => (
        <div key={item.name} className="item-row">
          <span className="item-name">{item.name}</span>
          <span className="item-qty">{item.quantity} {item.unit}</span>
        </div>
      ))}
    </>
  );
}

function MembersCard({ members }: { members: Member[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {members.map((m) => (
        <span key={m.id} style={{ padding: "6px 12px", background: "#f0f5f1", borderRadius: "999px", fontSize: "14px", fontWeight: 500 }}>
          {m.name} <span style={{ color: "#778078", fontWeight: 400, marginLeft: "6px" }}>{m.role}</span>
        </span>
      ))}
    </div>
  );
}

function PreferencesCard({ prefs }: { prefs: { budget: number; dietaryRestrictions: string[]; preferredCuisines: string[] } }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
      <div><strong>Budget:</strong> ${prefs.budget}</div>
      <div><strong>Dietary:</strong> {prefs.dietaryRestrictions.join(", ") || "None"}</div>
      <div><strong>Cuisines:</strong> {prefs.preferredCuisines.join(", ")}</div>
    </div>
  );
}

function LogCard({ entries }: { entries: ActionLogEntry[] }) {
  if (!entries.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <p>No actions recorded yet</p>
        <small>Execute a plan to see action history here</small>
      </div>
    );
  }
  return (
    <>
      {entries.slice().reverse().map((entry, idx) => (
        <div key={idx} className="log-entry">
          <div className="log-entry-header">
            <span className="log-tool">{entry.tool}</span>
            <span className={`log-status ${entry.status}`}>{entry.status}</span>
            <span className="log-timestamp">{new Date(entry.timestamp).toLocaleString()}</span>
          </div>
          <div className="log-detail">
            Input: {JSON.stringify(entry.input, null, 2)}
            {entry.result !== undefined && (
              <>Result: {JSON.stringify(entry.result, null, 2)}</>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function PlanStepCard({ step, index }: { step: { tool: string; input: unknown; description: string }; index: number }) {
  return (
    <div className="step-item">
      <div className="step-icon">{index + 1}</div>
      <div className="step-content">
        <div className="step-description">{step.description}</div>
        <div className="step-tool">{step.tool}</div>
      </div>
    </div>
  );
}

function ResultCard({ results }: { results: ExecuteResult[] }) {
  return (
    <div>
      {results.map((r, idx) => (
        <div key={idx} className="log-entry" style={{ borderLeft: `4px solid ${r.status === "success" ? "#2e7d32" : "#c62828"}` }}>
          <div className="log-entry-header">
            <span className="log-tool">{r.tool}</span>
            <span className={`log-status ${r.status}`}>{r.status}</span>
          </div>
          <div className="log-detail">{JSON.stringify(r.result, null, 2)}</div>
        </div>
      ))}
    </div>
  );
}

function PlanModal({
  isOpen,
  onClose,
  plan,
  onAccept,
  onCancel,
  isExecuting,
  executeResult,
  executeError,
}: {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  onAccept: () => void;
  onCancel: () => void;
  isExecuting: boolean;
  executeResult: ExecuteResult[] | null;
  executeError: string | null;
}) {
  if (!isOpen || !plan) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Confirm Action Plan</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {executeResult ? (
          <>
            <div className="modal-body">
              {executeError && <div className="error-message">⚠ {executeError}</div>}
              {!executeError && <div className="success-message">✓ Plan executed successfully</div>}
              <ResultCard results={executeResult} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <p style={{ marginBottom: 16, color: "#5a6658" }}>
                The following actions will be executed. Please review and confirm.
              </p>
              {plan.steps.map((step, idx) => (
                <PlanStepCard key={idx} step={step} index={idx} />
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onCancel} disabled={isExecuting}>Cancel</button>
              <button className="btn btn-primary" onClick={onAccept} disabled={isExecuting}>
                {isExecuting ? <><span className="spinner"></span> Executing...</> : "Accept & Execute"} </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [preferences, setPreferences] = useState<{ budget: number; dietaryRestrictions: string[]; preferredCuisines: string[] }>({ budget: 50, dietaryRestrictions: [], preferredCuisines: [] });
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [planInput, setPlanInput] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResult[] | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth()
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  useEffect(() => {
    if (backendStatus === "online") {
      loadDashboardData();
    }
  }, [backendStatus]);

  const loadDashboardData = async () => {
    try {
      const [pantryRes, membersRes, prefsRes, logRes] = await Promise.all([
        getPantry(),
        getMembers(),
        getPreferences(),
        getActionLog(),
      ]);
      setPantry(pantryRes.items);
      setMembers(membersRes.members);
      setPreferences(prefsRes);
      setActionLog(logRes.entries);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  };

  const handleCreatePlan = async () => {
    if (!planInput.trim()) return;
    setIsCreatingPlan(true);
    setPlanError(null);
    try {
      const res = await createPlan(planInput.trim());
      setPlan(res.plan);
      setShowModal(true);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleAccept = async () => {
    if (!plan) return;
    setIsExecuting(true);
    setExecuteError(null);
    try {
      const res = await executePlan({ plan, requestId: plan.requestId });
      setExecuteResult(res.results);
      await loadDashboardData();
    } catch (err) {
      setExecuteError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    setExecuteResult(null);
    setExecuteError(null);
    setShowModal(false);
    setPlan(null);
  };

  const handleCloseModal = () => {
    if (!executeResult) {
      handleCancel();
    }
  };

  return (
    <main className="page">
      <p className="eyebrow">HOUSEHOLD COORDINATION</p>
      <h1>HomeRelay</h1>
      <p className="subtitle">Coordinate dinner, groceries, errands, and reminders with AI-powered planning.</p>

      <div className="status" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", padding: "16px 20px" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: backendStatus === "online" ? "#2e7d32" : backendStatus === "checking" ? "#f9a825" : "#c62828" }} />
        <strong>Backend: </strong>
        <span>{backendStatus === "online" ? "Connected" : backendStatus === "checking" ? "Connecting..." : "Offline — start the backend"}</span>
        <Badge>Simulated Demo Data</Badge>
      </div>

      {planError && <div className="error-message">⚠ {planError}</div>}

      <section className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Plan Dinner</h2>
          </div>
          <div className="plan-input">
            <input
              type="text"
              className="input"
              placeholder="e.g., plan italian dinner for 4 guests under $50"
              value={planInput}
              onChange={(e) => setPlanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlan()}
              disabled={isCreatingPlan}
            />
            <button className="btn btn-primary" onClick={handleCreatePlan} disabled={isCreatingPlan || !planInput.trim()}>
              {isCreatingPlan ? <><span className="spinner"></span> Planning...</> : "Create Plan"} </button>
          </div>
          <p style={{ fontSize: 13, color: "#778078" }}>
            Try: <code>plan dinner for 4 guests</code>, <code>plan italian dinner under $30</code>, <code>plan mexican dinner for 6 people</code>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Pantry Inventory</h2>
              <Badge>Simulated</Badge>
            </div>
            <PantryCard items={pantry} />
          </div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Household Members</h2>
              <Badge>Simulated</Badge>
            </div>
            <MembersCard members={members} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Preferences</h2>
              <Badge>Simulated</Badge>
            </div>
            <PreferencesCard prefs={preferences} />
          </div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Action Log</h2>
              <Badge>Simulated</Badge>
            </div>
            <LogCard entries={actionLog} />
          </div>
        </div>
      </section>

      <PlanModal
        isOpen={showModal}
        onClose={handleCloseModal}
        plan={plan}
        onAccept={handleAccept}
        onCancel={handleCancel}
        isExecuting={isExecuting}
        executeResult={executeResult}
        executeError={executeError}
      />

      <footer style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #e3e7e1", color: "#778078", fontSize: 13, textAlign: "center" }}>
        <p>HomeRelay — Amazon Developer Hackathon Alexa+ Demo</p>
        <p>All data is simulated. No real smart-home devices or external services are connected.</p>
      </footer>
    </main>
  );
}