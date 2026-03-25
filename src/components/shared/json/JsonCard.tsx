interface JsonCardProps {
  title: string
  value: unknown
}

export function JsonCard({ title, value }: JsonCardProps) {
  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6">{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}
