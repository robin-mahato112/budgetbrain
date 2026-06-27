import { ChartNoAxesCombined } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', accepted: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel--brand">
        <div className="auth-brand"><span><ChartNoAxesCombined size={23} /></span><strong>BudgetBrain</strong></div>
        <div><p className="eyebrow">Start with a plan</p><h1>Your financial picture, organised and easier to act on.</h1><p>Create a private workspace for budgets, goals, debt planning, and educational AI guidance.</p></div>
      </section>
      <section className="auth-panel auth-panel--form">
        <form className="auth-card" onSubmit={submit}>
          <div><p className="eyebrow">Create account</p><h2>Set up your workspace</h2><p>Use a password you do not reuse elsewhere.</p></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Input label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <Input label="Email address" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <Input label="Password" type="password" minLength="6" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <label className="checkbox-field">
            <input type="checkbox" checked={form.accepted} onChange={(event) => setForm({ ...form, accepted: event.target.checked })} required />
            <span>I agree to the <Link to="/terms">terms</Link> and acknowledge the <Link to="/privacy">privacy notice</Link>.</span>
          </label>
          <Button type="submit" disabled={loading || !form.accepted}>{loading ? 'Creating account...' : 'Create account'}</Button>
          <p className="auth-card__switch">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </section>
    </main>
  );
}
