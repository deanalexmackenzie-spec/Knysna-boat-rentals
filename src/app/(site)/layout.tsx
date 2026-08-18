import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { getContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const indemnity = await getContent('indemnity');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer indemnityTitle={indemnity.title} indemnityBody={indemnity.body} />
    </div>
  );
}
