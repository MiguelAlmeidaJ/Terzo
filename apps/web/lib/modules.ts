export type FormField = {
  key: string;
  label: string;
  kind?: 'text' | 'date' | 'datetime-local' | 'textarea' | 'select';
  options?: string[];
};

export type Module = {
  id: string;
  title: string;
  description: string;
  collection: string;
  fields: FormField[];
  titleKey: string;
};

export const modules: Module[] = [
  {
    id: 'clients', title: 'Clientes', collection: 'clients', titleKey: 'name',
    description: 'Carteira de clientes e relacionamento.',
    fields: [
      { key: 'name', label: 'Nome' },
      { key: 'segment', label: 'Segmento' },
      { key: 'stage', label: 'Etapa', kind: 'select', options: ['Prospect', 'Negociação', 'Fechado', 'Perdido'] },
      { key: 'contact', label: 'Contato' },
      { key: 'notes', label: 'Observações', kind: 'textarea' },
    ],
  },
  {
    id: 'projects', title: 'Projetos', collection: 'projects', titleKey: 'title',
    description: 'Entregas, responsáveis e prazos.',
    fields: [
      { key: 'title', label: 'Título' },
      { key: 'clientId', label: 'ID do cliente' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Descrição', kind: 'textarea' },
      { key: 'due', label: 'Prazo', kind: 'date' },
    ],
  },
  {
    id: 'todos', title: 'Produção', collection: 'todos', titleKey: 'title',
    description: 'Tarefas e acompanhamento operacional.',
    fields: [
      { key: 'title', label: 'Tarefa' },
      { key: 'clientId', label: 'ID do cliente' },
      { key: 'assigneeId', label: 'ID do responsável' },
      { key: 'status', label: 'Status', kind: 'select', options: ['Pendente', 'Em andamento', 'Concluída'] },
      { key: 'priority', label: 'Prioridade', kind: 'select', options: ['Baixa', 'Média', 'Alta'] },
      { key: 'due', label: 'Prazo', kind: 'date' },
      { key: 'description', label: 'Descrição', kind: 'textarea' },
    ],
  },
  {
    id: 'campaigns', title: 'Campanhas', collection: 'campaigns', titleKey: 'title',
    description: 'Campanhas e planejamento de comunicação.',
    fields: [
      { key: 'title', label: 'Campanha' },
      { key: 'clientId', label: 'ID do cliente' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Descrição', kind: 'textarea' },
    ],
  },
  {
    id: 'creatives', title: 'Criativos', collection: 'creatives', titleKey: 'title',
    description: 'Biblioteca de peças e materiais criativos.',
    fields: [
      { key: 'title', label: 'Peça' },
      { key: 'clientId', label: 'ID do cliente' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Descrição', kind: 'textarea' },
    ],
  },
  {
    id: 'meetings', title: 'Agenda', collection: 'meetings', titleKey: 'title',
    description: 'Compromissos e reuniões da equipe.',
    fields: [
      { key: 'title', label: 'Compromisso' },
      { key: 'clientId', label: 'ID do cliente' },
      { key: 'kind', label: 'Tipo' },
      { key: 'when', label: 'Data e hora', kind: 'datetime-local' },
      { key: 'notes', label: 'Notas', kind: 'textarea' },
    ],
  },
  {
    id: 'members', title: 'Equipe', collection: 'members', titleKey: 'name',
    description: 'Diretório da equipe (alterações de acesso somente no painel administrativo).',
    fields: [{ key: 'name', label: 'Nome' }, { key: 'area', label: 'Área' }, { key: 'role', label: 'Função' }],
  },
  {
    id: 'services', title: 'Serviços', collection: 'services', titleKey: 'name',
    description: 'Catálogo de serviços da agência.',
    fields: [{ key: 'name', label: 'Serviço' }, { key: 'description', label: 'Descrição', kind: 'textarea' }],
  },
  {
    id: 'objectives', title: 'Objetivos', collection: 'objectives', titleKey: 'name',
    description: 'Objetivos estratégicos e comerciais.',
    fields: [{ key: 'name', label: 'Objetivo' }, { key: 'description', label: 'Descrição', kind: 'textarea' }],
  },
];

export function entryTitle(record: { id: string; data: Record<string, unknown> }, module: Module) {
  const value = record.data[module.titleKey] || record.data.name || record.data.title;
  return typeof value === 'string' && value.trim() ? value : record.id;
}
