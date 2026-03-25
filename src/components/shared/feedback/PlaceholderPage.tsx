import { PageHeader } from '@/components/shared/PageHeader'

interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description="This page will be completed in the next implementation phase." />
      <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        {title} module is scaffolded and route-ready.
      </div>
    </div>
  )
}