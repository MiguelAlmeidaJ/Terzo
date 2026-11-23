import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Validação do cliente | Terzo',
  description: 'Aprovação de conteúdos da Agência Terceiro Andar.',
  robots: { index: false, follow: false, nocache: true },
};

export default function ExternalApprovalLayout({ children }: { children: ReactNode }) {
  return children;
}
