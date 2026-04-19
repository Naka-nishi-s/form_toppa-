import { useEffect, useState } from "react";
import "./App.css";

type User = {
  username: string;
  email: string;
  role: string;
};

type LoginErrors = Partial<Record<"username" | "password", string>>;

// ---- Login ----

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    if (errors[e.target.name as keyof LoginErrors]) {
      const next = { ...errors };
      delete next[e.target.name as keyof LoginErrors];
      setErrors(next);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: LoginErrors = {};
    if (!form.username.trim()) next.username = "ユーザー名は必須です";
    if (!form.password.trim()) next.password = "パスワードは必須です";
    if (Object.keys(next).length > 0) { setErrors(next); return; }

    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "ログインに失敗しました");
      }
      const loginData = await res.json();
      if (loginData.redirect) {
        window.location.href = loginData.redirect;
        return;
      }
      const meRes = await fetch("/api/me", { credentials: "include" });
      const user: User = await meRes.json();
      onLogin(user);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="card">
        <h1 className="card-title">ログイン</h1>
        <form onSubmit={handleSubmit} className="form" noValidate>
          <label>
            ユーザー名 <span className="required">*</span>
            <input name="username" value={form.username} onChange={handleChange} />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </label>
          <label>
            パスワード <span className="required">*</span>
            <input type="password" name="password" value={form.password} onChange={handleChange} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "確認中..." : "ログイン"}
          </button>
        </form>
        {submitError && <p className="error">{submitError}</p>}
      </div>
    </div>
  );
}

// ---- Dashboard ----

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="dashboard-logo">MyService</span>
        <div className="dashboard-user">
          {/* ❌ 意図的に危険な表示（XSSデモ用） */}
          <span dangerouslySetInnerHTML={{ __html: `ようこそ、<strong>${user.username}</strong> さん` }} />
          <button className="btn-logout" onClick={onLogout}>ログアウト</button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2>ダッシュボード</h2>
        <div className="stats">
          <div className="stat-card">
            <p className="stat-label">ユーザー名</p>
            <p className="stat-value">{user.username}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">メールアドレス</p>
            <p className="stat-value">{user.email}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">ロール</p>
            <p className="stat-value">{user.role}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---- App ----

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUser(u))
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = () => {
    document.cookie = "session_id=; max-age=0; path=/";
    setUser(null);
  };

  if (checking) return null;

  return user
    ? <Dashboard user={user} onLogout={handleLogout} />
    : <LoginPage onLogin={setUser} />;
}
