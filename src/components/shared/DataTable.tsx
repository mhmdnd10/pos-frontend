import type { ReactNode } from 'react'

export interface DataTableColumn<TData> {
  key: keyof TData | string
  header: string
  render?: (row: TData) => ReactNode
}

interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[]
  rows?: TData[] | null
  getRowId: (row: TData, index: number) => string
  emptyMessage?: string
}

export function DataTable<TData>({
  columns,
  rows,
  getRowId,
  emptyMessage = 'No records found.',
}: DataTableProps<TData>) {
  const normalizedRows = Array.isArray(rows) ? rows : []

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-4 py-3 font-medium text-muted-foreground">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {normalizedRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              normalizedRows.map((row, rowIndex) => (
                <tr key={getRowId(row, rowIndex)} className="border-t">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-4 py-3">
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[String(column.key)] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}