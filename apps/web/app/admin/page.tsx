'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { post, request } from '../../lib/api';

type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'member';
  status: 'active' | 'disabled';
  must_change: boolean;
  member_id: string;
  last_login: number | null;
  sessions: number;
};
type Member = { id: string; name: string; area: string; accountId: string; disabled: boolean };
type Audit = { at: number; actor: string; action: string; target: string };
type UsersResult = { me: string; users: User[]; members: Member[] };
const roles: Record<string, string> = { owner: 'Proprietário', editor: 'Administrador', member: 'Integrante' };

export default function AdminPage() {
  const [users, setUsers] = useState<UsersResult>({ me: '', users: [], members: [] });
  const [audit, setAudit] = useState<Audit[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', email: '', role: 'member', memberId: '' });

  const reload = useCallback(async () => {
    try {
      const [data, logs] = await Promise.all([
        request<UsersResult>('/api/admin/users'),
        request<{ rows: Audit[] }>('/api/admin/audit'),
      ]);
      setUsers(data);
      setAudit(logs.rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os usuários.');
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    setPassword('');
    try {
      const response = await post<{ tempPassword: string }>('/api/admin/users', form);
      setPassword(response.tempPassword);
      setSuccess('Login criado. A senha provisória aparece apenas nesta tela.');
      setForm({ name: '', username: '', email: '', role: 'member', memberId: '' });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao criar usuário.');
    } finally {
      setPending(false);
    }
  }

  async function update(id: string, changes: Record<string, unknown>, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return;
    setPending(true);
    setError('');
    setSuccess('');
    setPassword('');
    try {
      const result = await request<{ tempPassword?: string }>('/api/admin/users/' + encodeURIComponent(id), {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      if (result.tempPassword) setPassword(result.tempPassword);
      setSuccess('Usuário atualizado com sucesso.');
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao atualizar usuário.');
      await reload();
    } finally {
      setPending(false);
    }
  }

  function availableMembers(userId: string) {
    return users.members.filter((m) => !m.accountId || m.accountId === userId || !users.users.some((u) => u.id === m.accountId));
  }

  return (
    <main className="admin-page">
      <header className="top-bar">
        <Link href="/" className="brand-link"><span className="mini-mark">T.</span><b>Terzo</b></Link>
        <div className="top-right"><span>Administração</span><Link className="button secondary" href="/">Voltar ao painel</Link></div>
      </header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">GERENCIAMENTO</div><h1>Contas e acessos</h1><p className="muted">Gerencie usuários, permissões no servidor e sessões.</p></div></div>

        {error && <div className="alert" role="alert">{error}</div>}
        {success && <div className="notice" role="status">{success}</div>}
        {password && (
          <div className="secret-panel" role="status">
            <div><strong>Senha provisória</strong><p>Copie e envie por um canal seguro. Ela não aparecerá novamente.</p></div>
            <code>{password}</code>
            <button className="button secondary" onClick={() => setPassword('')}>Ocultar</button>
          </div>
        )}

        <section className="surface">
          <div className="section-heading"><h2>Criar acesso</h2><span className="muted small">Credenciais individuais</span></div>
          <form onSubmit={create} className="form-grid">
            <label>Nome completo<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} required /></label>
            <label>Usuário<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} minLength={3} maxLength={40} required /></label>
            <label>E-mail<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></label>
            <label>Integrante da equipe<select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}><option value="">Sem vínculo</option>{availableMembers('').map((m) => <option key={m.id} value={m.id}>{m.name}{m.area ? ' · ' + m.area : ''}</option>)}</select></label>
            <label>Papel<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{Object.entries(roles).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
            <div className="form-submit"><button className="button primary" disabled={pending} type="submit">Criar login</button></div>
          </form>
        </section>

        <section className="surface">
          <div className="section-heading"><h2>Usuários</h2><span className="pill">{users.users.length} contas</span></div>
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Usuário</th><th>Equipe</th><th>Papel</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead>
            <tbody>{users.users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong><span className="subtext">{user.username} · {user.email || 'Sem e-mail'}</span></td>
                <td><select disabled={pending} value={user.member_id || ''} onChange={(e) => void update(user.id, { memberId: e.target.value })} aria-label={'Equipe de ' + user.name}>
                  <option value="">Sem vínculo</option>
                  {availableMembers(user.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select></td>
                <td>{user.id === users.me ? roles[user.role] : <select disabled={pending} value={user.role} onChange={(e) => void update(user.id, { role: e.target.value })}>{Object.entries(roles).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select>}</td>
                <td><span className={'pill ' + (user.status === 'active' ? 'ok' : 'off')}>{user.status === 'active' ? 'Ativo' : 'Desativado'}</span>{user.must_change && <span className="subtext">Senha provisória</span>}</td>
                <td>{user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : 'Nunca'}<span className="subtext">{user.sessions} sessão(ões)</span></td>
                <td><div className="actions">{user.id === users.me ? <span className="muted small">Sua conta</span> : <>
                  <button className="button subtle" disabled={pending} onClick={() => void update(user.id, { resetPassword: true }, 'Redefinir a senha desta conta?')}>Nova senha</button>
                  <button className="button subtle" disabled={pending} onClick={() => void update(user.id, { revokeSessions: true }, 'Encerrar todas as sessões deste usuário?')}>Revogar</button>
                  <button className="button subtle" disabled={pending} onClick={() => void update(user.id, { status: user.status === 'active' ? 'disabled' : 'active' }, 'Alterar o status desta conta?')}>{user.status === 'active' ? 'Desativar' : 'Ativar'}</button>
                </>}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>

        <section className="surface">
          <div className="section-heading"><h2>Registro de atividade</h2><span className="muted small">Últimos {audit.length} eventos</span></div>
          <div className="audit-list">{audit.map((event, index) => <div className="audit-entry" key={index}><time>{new Date(event.at).toLocaleString('pt-BR')}</time><strong>{event.action}</strong><span>{event.actor || 'sistema'}{event.target ? ' → ' + event.target : ''}</span></div>)}</div>
        </section>
      </div>
    </main>
  );
}
