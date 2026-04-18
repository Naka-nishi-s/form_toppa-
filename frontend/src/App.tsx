import { useState } from 'react'
import './App.css'

type FormData = {
  name: string
  email: string
  message: string
}

type SubmitResult = {
  received: FormData
}

function App() {
  const [form, setForm] = useState<FormData>({ name: '', email: '', message: '' })
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('http://localhost:8000/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: SubmitResult = await res.json()
      setResult(data)
      setForm({ name: '', email: '', message: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>お問い合わせフォーム</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>
          名前
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          メールアドレス
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          メッセージ
          <textarea name="message" value={form.message} onChange={handleChange} rows={4} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? '送信中...' : '送信'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <h2>送信内容</h2>
          <p><strong>名前:</strong> {result.received.name}</p>
          <p><strong>メール:</strong> {result.received.email}</p>
          <p><strong>メッセージ:</strong> {result.received.message}</p>
        </div>
      )}
    </div>
  )
}

export default App
