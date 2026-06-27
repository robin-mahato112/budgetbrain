import { ChartNoAxesCombined } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel--brand">
        <div className="auth-brand"><span><ChartNoAxesCombined size={23} /></span><strong>BudgetBrain</strong></div>
        <div><p className="eyebrow">Financial clarity</p><h1>Make confident money decisions with one focused workspace.</h1><p>Understand spending, plan goals, explore debt scenarios, and ask your AI finance guide.</p></div>
      </section>
      <section className="auth-panel auth-panel--form">
        <form className="auth-card" onSubmit={submit}>
          <div><p className="eyebrow">Welcome back</p><h2>Sign in to BudgetBrain</h2><p>Continue to your personal finance dashboard.</p></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Input label="Email address" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
          <p className="auth-card__switch">New to BudgetBrain? <Link to="/register">Create an account</Link></p>
          <p className="auth-card__legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></p>
        </form>
      </section>
    </main>
  );
}
