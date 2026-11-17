'use client';

import { FormEvent, useEffect, useState } from 'react';
import { post, request, Session } from '../../lib/api';

type LoginResult = { ok: boolean; mustChange: boolean };

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'password'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    request<Session>('/api/auth/me')
      .then((user) => {
        if (!user.mustChange) location.replace('/');
        else setMode('password');
      })
      .catch(() => {
        if (new URLSearchParams(location.search).has('expirada')) setMessage('Sua sessão expirou. Entre novamente.');
      });
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setPending(true);
    setMessage('');
    try {
      const result = await post<LoginResult>('/api/auth/login', { username: username.trim(), password });
      if (result.mustChange) setMode('password');
      else location.replace('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setPending(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (next.length < 10) return setMessage('A nova senha deve ter pelo menos 10 caracteres.');
    if (next !== confirm) return setMessage('As novas senhas não conferem.');
    setPending(true);
    setMessage('');
    try {
      await post('/api/auth/password', { current: password, next });
      location.replace('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar a senha.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="brand-mark">T<span>.</span></div>
        <div className="eyebrow">AGÊNCIA TERCEIRO ANDAR</div>
        <h1>{mode === 'login' ? 'Bem-vindo ao Terzo.' : 'Defina sua senha.'}</h1>
        <p className="muted">{mode === 'login' ? 'Entre para acompanhar seus projetos, clientes e entregas.' : 'Troque sua senha provisória antes de continuar.'}</p>
        {message && <div className="alert" role="alert">{message}</div>}
        {mode === 'login' ? (
          <form onSubmit={login} className="stack">
            <label>Usuário<input value={username} autoComplete="username" onChange={(e) => setUsername(e.target.value)} required placeholder="Seu usuário" /></label>
            <label>Senha<input value={password} autoComplete="current-password" type={visible ? 'text' : 'password'} onChange={(e) => setPassword(e.target.value)} required placeholder="Sua senha" /></label>
            <label className="checkbox-line"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Mostrar senha</label>
            <button className="button primary full" disabled={pending} type="submit">{pending ? 'Entrando…' : 'Acessar plataforma'}</button>
          </form>
        ) : (
          <form onSubmit={changePassword} className="stack">
            <label>Senha atual<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            <label>Nova senha<input type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} required /></label>
            <label>Confirmar senha<input type="password" autoComplete="new-password" minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
            <button className="button primary full" disabled={pending} type="submit">{pending ? 'Salvando…' : 'Salvar e continuar'}</button>
          </form>
        )}
        <div className="auth-foot">Terzo · Gestão integrada</div>
      </section>
      <aside className="auth-art">
        <div className="art-label">ORGANIZE. COLABORE. ENTREGUE.</div>
        <div className="art-display">Seu trabalho,<br />em outro nível<span>.</span></div>
        <p>Uma plataforma para transformar operações em resultados.</p>
      </aside>
    </main>
  );
}
