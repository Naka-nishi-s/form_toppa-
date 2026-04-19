import { useState } from "react";
import "./App.css";

type FormData = {
  name: string;
  email: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

type SubmitResult = {
  received: FormData;
};

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "名前は必須です";
  if (!form.email.trim()) {
    errors.email = "メールアドレスは必須です";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "有効なメールアドレスを入力してください";
  }
  if (!form.message.trim()) errors.message = "メッセージは必須です";
  return errors;
}

function App() {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    if (errors[e.target.name as keyof FormData]) {
      const next = { ...errors };
      delete next[e.target.name as keyof FormData];
      setErrors(next);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setSubmitError(null);
    setResult(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Server error: ${res.status}`);
      }
      const data: SubmitResult = await res.json();
      setResult(data);
      setForm({ name: "", email: "", message: "" });
      setErrors({});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>お問い合わせフォーム</h1>
      <form onSubmit={handleSubmit} className="form" noValidate>
        <label>
          名前 <span className="required">*</span>
          <input name="name" value={form.name} onChange={handleChange} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label>
          メールアドレス <span className="required">*</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>
        <label>
          メッセージ <span className="required">*</span>
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            rows={4}
          />
          {errors.message && (
            <span className="field-error">{errors.message}</span>
          )}
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "送信中..." : "送信"}
        </button>
      </form>

      {submitError && <p className="error">{submitError}</p>}

      {result && (
        <div className="result">
          <h2>送信内容</h2>
          {/* ❌ 意図的に危険な表示に変える */}
          <div
            dangerouslySetInnerHTML={{
              __html: `
      <p><strong>名前:</strong> ${result.received.name}</p>
      <p><strong>メール:</strong> ${result.received.email}</p>
      <p><strong>メッセージ:</strong> ${result.received.message}</p>
    `,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
