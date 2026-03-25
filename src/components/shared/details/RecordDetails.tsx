import { DataTable } from '@/components/shared/DataTable'

interface RecordDetailsProps {
  title: string
  data: Record<string, unknown>
  summaryKeys: string[]
  preferredDetailKeys: string[]
}

function toDisplay(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'object') {
    return '[Structured Data]'
  }

  return String(value)
}

export function RecordDetails({ title, data, summaryKeys, preferredDetailKeys }: RecordDetailsProps) {
  const summaryEntries = summaryKeys
    .map((key) => ({ key, value: data[key] }))
    .filter((entry) => entry.value !== undefined)

  const detailKeys = preferredDetailKeys.filter((key) => {
    const value = data[key]
    return value !== undefined && !Array.isArray(value) && typeof value !== 'object'
  })

  const itemsValue = data.items
  const itemRows = Array.isArray(itemsValue) ? itemsValue : []
  const itemColumns = itemRows.length > 0 && typeof itemRows[0] === 'object' && itemRows[0] !== null
    ? Object.keys(itemRows[0] as Record<string, unknown>).map((key) => ({ key, header: key }))
    : []

  return (
    <div className="space-y-5">
      {summaryEntries.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryEntries.map((entry) => (
            <div key={entry.key} className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{entry.key.replaceAll('_', ' ')}</p>
              <p className="mt-2 text-xl font-semibold">{toDisplay(entry.value)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-medium text-muted-foreground">{title} Information</h3>
        </div>
        <div className="grid gap-x-6 gap-y-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {detailKeys.map((key) => (
            <div key={key}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{key.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-sm font-medium">{toDisplay(data[key])}</p>
            </div>
          ))}
        </div>
      </div>

      {itemRows.length > 0 && itemColumns.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Items</h3>
          <DataTable
            columns={itemColumns}
            rows={itemRows as Record<string, unknown>[]}
            getRowId={(row, index) => String((row.id as number | undefined) ?? index)}
          />
        </div>
      ) : null}
    </div>
  )
}
