'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { DocumentRow, post, request, Session } from '../lib/api';
import { entryTitle, Module, modules } from '../lib/modules';

type Editable = { id?: string; data: Record<string, unknown> };
const counters = ['clients', 'projects', 'todos', 'creatives'];
const initials = (value: string) => value.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

export default function HomePage() {
  const [me, setMe] = useState<Session | null>(null);
  const [active, setActive] = useState('overview');
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<Editable | null>(null);
  const [showDetails, setShowDetails] = useState<DocumentRow | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const module = modules.find((item) => item.id === active);
  const visible = useMemo(() => rows.filter((row) => (
    JSON.stringify(row.data).toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')) ||
    row.id.includes(search.trim())
  )), [rows, search]);

  const loadModule = useCallback(async (collection: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await request<{ docs: DocumentRow[] }>('/api/db?coll=' + encodeURIComponent(collection));
      setRows(result.docs);
      setSummary((old) => ({ ...old, [collection]: result.docs.length }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    request<Session>('/api/auth/me').then(setMe).catch(() => location.replace('/login'));
    void Promise.allSettled(counters.map(async (collection) => {
      const result = await request<{ docs: DocumentRow[] }>('/api/db?coll=' + collection);
      setSummary((old) => ({ ...old, [collection]: result.docs.length }));
    }));
  }, []);

  useEffect(() => {
    const selected = modules.find((item) => item.id === active);
    setSearch('');
    setEditor(null);
    setShowDetails(null);
    setRows([]);
    if (selected) void loadModule(selected.collection);
  }, [active, loadModule]);

  async function logout() {
    try { await post('/api/auth/logout', {}); } finally { location.assign('/login'); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || !module) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const id = editor.id || 'r_' + crypto.randomUUID().replaceAll('-', '');
      const data: Record<string, unknown> = { ...editor.data };
      if (!editor.id) {
        data.createdAt = new Date().toISOString();
        data.createdBy = me?.id || '';
      }
      data.updatedAt = new Date().toISOString();
      data.updatedBy = me?.id || '';
      await post('/api/db/set', { coll: module.collection, id, data });
      setEditor(null);
      setNotice('Registro salvo com sucesso.');
      await loadModule(module.collection);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.');
    } finally {
      setPending(false);
    }
  }

  async function remove(row: DocumentRow) {
    if (!module || !window.confirm('Excluir este registro? Esta ação não poderá ser desfeita.')) return;
    setPending(true);
    setError('');
    try {
      await post('/api/db/delete', { coll: module.collection, id: row.id });
      setNotice('Registro removido.');
      setShowDetails(null);
      await loadModule(module.collection);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir.');
    } finally {
      setPending(false);
    }
  }

  function renderValue(value: unknown) {
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  }

  function openNew(selected: Module) {
    const data = Object.fromEntries(selected.fields.map((field) => [field.key, '']));
    setEditor({ data });
    setShowDetails(null);
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="sidebar-brand"><span className="brand-mark">T<span>.</span></span><span><b>TERZO</b><small>WORKSPACE</small></span></Link>
        <div className="sidebar-caption">ÁREA DE TRABALHO</div>
        <nav className="nav-list" aria-label="Módulos">
          <button className={'nav-item ' + (active === 'overview' ? 'active' : '')} onClick={() => setActive('overview')}><span className="nav-glyph">◫</span>Painel</button>
          {modules.map((item) => <button key={item.id} className={'nav-item ' + (active === item.id ? 'active' : '')} onClick={() => setActive(item.id)}>
            <span className="nav-glyph">{item.title.charAt(0)}</span>{item.title}
          </button>)}
        </nav>
        <div className="sidebar-footer">
          {me?.canEdit && <Link href="/admin" className="nav-item">⚙ Administração</Link>}
          <button className="nav-item" onClick={() => void logout()}>Sair da conta</button>
          <div className="account"><span className="account-avatar">{initials(me?.name || 'T')}</span><div><strong>{me?.name || 'Carregando…'}</strong><small>{me?.role || '—'}</small></div></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="workspace-header">
          <div className="breadcrumb"><span>Terzo</span><span className="slash">/</span><strong>{module?.title || 'Painel'}</strong></div>
          <div className="header-actions"><span className="date-label">{new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}</span><span className="account-avatar small-avatar">{initials(me?.name || 'T')}</span></div>
        </header>

        <div className="workspace-body">
          {active === 'overview' ? (
            <>
              <div className="page-heading"><div><div className="eyebrow">VISÃO GERAL</div><h1>Bom trabalho, {me?.name?.split(' ')[0] || 'equipe'}.</h1><p className="muted">O que está acontecendo na operação da agência.</p></div></div>
              <div className="metrics-grid">{[
                { id: 'clients', label: 'Clientes', detail: 'Carteira' },
                { id: 'projects', label: 'Projetos', detail: 'Entregas' },
                { id: 'todos', label: 'Tarefas', detail: 'Produção' },
                { id: 'creatives', label: 'Criativos', detail: 'Biblioteca' },
              ].map((item) => <button key={item.id} className="metric-card" onClick={() => setActive(item.id)}>
                <span className="metric-title">{item.label}<span>↗</span></span>
                <strong>{summary[item.id] ?? '—'}</strong>
                <span className="metric-sub">{item.detail}</span>
              </button>)}</div>
              <section className="surface">
                <div className="section-heading"><h2>Áreas de trabalho</h2><span className="muted small">Acesso rápido aos dados da agência</span></div>
                <div className="module-grid">{modules.filter((item) => item.id !== 'members').map((item) => <button className="module-card" key={item.id} onClick={() => setActive(item.id)}>
                  <span className="module-symbol">{item.title[0]}</span>
                  <strong>{item.title}</strong><span className="muted small">{item.description}</span><span className="module-arrow">↗</span>
                </button>)}</div>
              </section>
              <section className="surface">
                <h2>Sobre esta versão</h2>
                <p className="muted">O Terzo agora utiliza Next.js, React, NestJS e Prisma em um monorepo pnpm. Esta é a interface nativa inicial. Alguns fluxos avançados do sistema legado serão reconstruídos em etapas; a API mantém os dados e as regras de segurança.</p>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div><div className="eyebrow">GESTÃO / {module?.collection.toUpperCase()}</div><h1>{module?.title}</h1><p className="muted">{module?.description}</p></div>
                <div className="heading-actions">
                  <button className="button secondary" onClick={() => module && void loadModule(module.collection)} disabled={loading}>Atualizar</button>
                  {module && module.id !== 'members' && <button className="button primary" onClick={() => openNew(module)}>+ Novo registro</button>}
                </div>
              </div>
              {error && <div className="alert" role="alert">{error}</div>}
              {notice && <div className="notice" role="status">{notice}</div>}
              <section className="surface">
                <div className="list-toolbar"><h2>{visible.length} registro(s)</h2><input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar registros..." aria-label="Buscar" /></div>
                {loading ? <p className="empty-state">Carregando dados…</p> : visible.length === 0 ? <p className="empty-state">{search ? 'Nenhum resultado para a busca.' : 'Nenhum registro nesta área.'}</p> :
                  <div className="record-list">{visible.map((row) => <button key={row.id} className="record" onClick={() => setShowDetails(row)}>
                    <span className="record-icon">{initials(entryTitle(row, module!)) || '•'}</span>
                    <span className="record-main"><strong>{entryTitle(row, module!)}</strong><small>{String(row.data.description || row.data.segment || row.data.kind || row.id).slice(0, 115)}</small></span>
                    <span className="record-status">{String(row.data.status || row.data.stage || '')}</span><span className="record-chevron">›</span>
                  </button>)}</div>}
              </section>
            </>
          )}
        </div>
      </main>

      {showDetails && module && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowDetails(null); }}>
          <section className="modal-dialog" role="dialog" aria-modal="true" aria-label="Detalhes do registro">
            <div className="modal-top"><div><div className="eyebrow">{module.title}</div><h2>{entryTitle(showDetails, module)}</h2></div><button className="close-button" onClick={() => setShowDetails(null)} aria-label="Fechar">×</button></div>
            <div className="detail-grid">{Object.entries(showDetails.data).filter(([, v]) => v !== undefined).map(([key, value]) => <div className="detail-field" key={key}><strong>{module.fields.find((field) => field.key === key)?.label || key}</strong><span>{renderValue(value)}</span>{typeof value === 'string' && /^[a-f0-9]{32}$/.test(value) && <a href={'/_blob/' + value} target="_blank" rel="noreferrer">Abrir anexo</a>}</div>)}</div>
            <div className="modal-actions">{module.id !== 'members' && <><button className="button danger" disabled={pending} onClick={() => void remove(showDetails)}>Excluir</button><button className="button primary" onClick={() => { setEditor({ id: showDetails.id, data: { ...showDetails.data } }); setShowDetails(null); }}>Editar</button></>}<button className="button secondary" onClick={() => setShowDetails(null)}>Fechar</button></div>
          </section>
        </div>
      )}

      {editor && module && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditor(null); }}>
          <section className="modal-dialog" role="dialog" aria-modal="true" aria-label="Editar registro">
            <div className="modal-top"><div><div className="eyebrow">{module.title}</div><h2>{editor.id ? 'Editar registro' : 'Novo registro'}</h2></div><button className="close-button" onClick={() => setEditor(null)} aria-label="Fechar">×</button></div>
            {error && <div className="alert" role="alert">{error}</div>}
            <form onSubmit={save} className="stack">
              <div className="form-grid">
                {module.fields.map((field) => <label key={field.key}>{field.label}
                  {field.kind === 'textarea' ? <textarea value={String(editor.data[field.key] ?? '')} onChange={(e) => setEditor({ ...editor, data: { ...editor.data, [field.key]: e.target.value } })} rows={4} /> :
                    field.kind === 'select' ? <select value={String(editor.data[field.key] ?? '')} onChange={(e) => setEditor({ ...editor, data: { ...editor.data, [field.key]: e.target.value } })}><option value="">Selecione</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> :
                    <input type={field.kind || 'text'} value={String(editor.data[field.key] ?? '')} onChange={(e) => setEditor({ ...editor, data: { ...editor.data, [field.key]: e.target.value } })} required={field.key === module.titleKey} />}
                </label>)}
              </div>
              <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setEditor(null)}>Cancelar</button><button className="button primary" disabled={pending} type="submit">{pending ? 'Salvando…' : 'Salvar registro'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
