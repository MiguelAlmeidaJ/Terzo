'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import './approval.css';

type Post = { id: string; date: string; title: string; caption: string; format: string; notes: string; kind: string; movedFrom?: string };
type Attachment = { assetId?: string; url?: string; name: string; mime?: string };
type Approval = {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'changes';
  snapshot: { clientName: string; title: string; kind: 'calendar' | 'creative'; month?: string; posts?: Post[]; files: Attachment[] };
  createdAt: number;
  expiresAt: number;
  decidedAt?: number;
  decidedBy?: string;
  comment?: string;
};

function friendlyError(code: string) {
  const map: Record<string, string> = {
    link_not_found: 'Este endereço de aprovação não existe.',
    link_expired_or_revoked: 'Este link expirou ou foi revogado. Solicite um novo link à agência.',
    material_updated_request_new_link: 'O material foi atualizado desde o envio. Solicite um novo link para analisar a versão atualizada.',
    already_decided: 'Esta validação já recebeu uma resposta.',
    name_required: 'Informe o seu nome para registrar a decisão.',
    comment_required: 'Descreva os ajustes necessários para a agência.',
  };
  return map[code] || 'Não foi possível concluir a solicitação. Tente novamente.';
}

function stamp(n: number | undefined) {
  return n ? new Date(n).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

export default function ExternalApprovalPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [data, setData] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [decision, setDecision] = useState<'approved' | 'changes' | null>(null);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    let live = true;
    if (!token) return;
    fetch('/api/public-approvals/' + encodeURIComponent(token), { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(friendlyError(body.error));
        return body as Approval;
      })
      .then((result) => { if (live) setData(result); })
      .catch((cause) => { if (live) setError(cause.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!decision || !data || working) return;
    setWorking(true);
    setError('');
    try {
      const response = await fetch('/api/public-approvals/' + encodeURIComponent(token) + '/decision', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Terzo': '1' },
        body: JSON.stringify({ decision, name: name.trim(), comment: comment.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(friendlyError(body.error));
      setData({ ...data, status: body.status, decidedBy: name.trim(), comment: comment.trim(), decidedAt: Date.now() });
      setDecision(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao registrar resposta.');
    } finally {
      setWorking(false);
    }
  }

  function fileElement(file: Attachment, index: number) {
    const url = file.assetId
      ? '/api/public-approvals/' + encodeURIComponent(token) + '/file/' + encodeURIComponent(file.assetId)
      : file.url;
    if (!url) return null;
    const media = file.mime || '';
    return (
      <div className="external-file" key={file.assetId || file.url || index}>
        {media.startsWith('image/') && media !== 'image/svg+xml' && <img src={url} alt={file.name} loading="lazy" />}
        {media.startsWith('video/') && <video src={url} controls preload="metadata" playsInline />}
        {media === 'application/pdf' && <iframe src={url} title={file.name} loading="lazy" />}
        <div className="external-file-bottom">
          <span>{file.name}</span>
          <a href={url} target="_blank" rel="noopener noreferrer">Abrir material <span aria-hidden>↗</span></a>
        </div>
      </div>
    );
  }

  return (
    <main className="external-approval">
      <div className="external-wrap">
        <header className="external-header">
          <div className="external-brand"><span className="external-brand-icon">T<span>.</span></span><span>TERZO<small>AGÊNCIA TERCEIRO ANDAR</small></span></div>
          <span className="external-header-note">Validação de conteúdo</span>
        </header>

        {loading ? <section className="external-box"><p>Carregando o material enviado…</p></section> :
          !data ? <section className="external-box external-error"><h1>Link indisponível</h1><p>{error}</p><small>Solicite à equipe um novo endereço de validação.</small></section> :
            <>
              <section className="external-hero">
                <div className="external-eyebrow">{data.snapshot.kind === 'calendar' ? 'CALENDÁRIO EDITORIAL' : 'ARTE AVULSA'}</div>
                <h1>{data.snapshot.title}</h1>
                <p>Olá, {data.snapshot.clientName}. Confira o material preparado pela Agência Terceiro Andar e registre sua aprovação ou os ajustes necessários.</p>
                <div className="external-meta"><span>Enviado em {stamp(data.createdAt)}</span><span>Link válido até {stamp(data.expiresAt)}</span></div>
              </section>

              {data.snapshot.posts?.length ? (
                <section className="external-box">
                  <div className="external-heading"><h2>Planejamento das publicações</h2><span>{data.snapshot.posts.length} publicações</span></div>
                  <div className="external-posts">
                    {data.snapshot.posts.map((post) => (
                      <article className="external-post" key={post.id}>
                        <div className="external-post-date"><strong>{post.date.slice(-2)}</strong><small>{new Date(post.date + 'T12:00:00Z').toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}</small></div>
                        <div className="external-post-info">
                          <div className="external-post-tags"><span>{post.kind === 'special' ? 'Data especial / campanha' : 'Publicação programada'}</span>{post.format && <span>{post.format}</span>}</div>
                          <h3>{post.title || 'Tema a definir'}</h3>
                          {post.caption && <p>{post.caption}</p>}
                          {post.notes && <p className="external-notes">{post.notes}</p>}
                          {post.movedFrom && <small className="external-moved">Realocada de {post.movedFrom.split('-').reverse().join('/')}</small>}
                        </div>
                        <time>{post.date.split('-').reverse().join('/')}</time>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {data.snapshot.files.length > 0 && <section className="external-box">
                <div className="external-heading"><h2>{data.snapshot.kind === 'calendar' ? 'Artes e arquivos do calendário' : 'Material para aprovação'}</h2><span>{data.snapshot.files.length} arquivo(s)</span></div>
                <div className="external-files">{data.snapshot.files.map(fileElement)}</div>
              </section>}

              <section className="external-box external-decision">
                {data.status === 'pending' ? (
                  <>
                    <h2>Está tudo certo com o conteúdo?</h2>
                    <p>Seu retorno ficará registrado para que nossa equipe possa dar continuidade ao trabalho.</p>
                    <div className="external-actions">
                      <button className={decision === 'approved' ? 'selected' : ''} onClick={() => setDecision('approved')}>✓ Aprovar material</button>
                      <button className={decision === 'changes' ? 'selected changes' : 'changes'} onClick={() => setDecision('changes')}>↺ Solicitar ajustes</button>
                    </div>
                    {decision && <form className="external-form" onSubmit={submit}>
                      <label>Seu nome<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} placeholder="Nome de quem está aprovando" /></label>
                      <label>{decision === 'changes' ? 'Quais ajustes precisamos fazer?' : 'Observações (opcional)'}
                        <textarea value={comment} onChange={(e) => setComment(e.target.value)} required={decision === 'changes'} minLength={decision === 'changes' ? 3 : undefined} maxLength={2000} rows={4} placeholder={decision === 'changes' ? 'Indique a data, a arte e o que precisa mudar…' : 'Alguma observação para a equipe?'} />
                      </label>
                      {error && <p className="external-inline-error" role="alert">{error}</p>}
                      <button className="external-submit" disabled={working} type="submit">{working ? 'Registrando…' : decision === 'approved' ? 'Confirmar aprovação' : 'Enviar solicitação de ajustes'}</button>
                    </form>}
                  </>
                ) : (
                  <div className="external-done" role="status">
                    <span className={data.status === 'approved' ? 'external-done-icon' : 'external-done-icon changes'}>{data.status === 'approved' ? '✓' : '↺'}</span>
                    <h2>{data.status === 'approved' ? 'Material aprovado!' : 'Ajustes solicitados'}</h2>
                    <p>Resposta registrada{data.decidedBy ? ' por ' + data.decidedBy : ''}{data.decidedAt ? ' em ' + stamp(data.decidedAt) : ''}.</p>
                    {data.comment && <blockquote>{data.comment}</blockquote>}
                    <small>Obrigado! A Agência Terceiro Andar recebeu sua resposta.</small>
                  </div>
                )}
              </section>
            </>
        }
        <footer className="external-footer">Terzo · Agência Terceiro Andar</footer>
      </div>
    </main>
  );
}
