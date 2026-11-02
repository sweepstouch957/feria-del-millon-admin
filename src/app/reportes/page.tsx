import { IncomePage } from "@features/ingresos/components/IncomePage";

export default async function Page({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  return <IncomePage initialPanel={ver} />;
}
