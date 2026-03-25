import { Button } from '@/components/shared/ui/button'
import type { PaginationMeta } from '@/lib/types/api'

interface PaginationControlsProps {
  meta: PaginationMeta | null
  onPageChange: (page: number) => void
  isLoading?: boolean
}

export function PaginationControls({ meta, onPageChange, isLoading = false }: PaginationControlsProps) {
  if (!meta) {
    return null
  }

  const canPrev = meta.current_page > 1
  const canNext = meta.current_page < meta.last_page

  return (
    <div className="mt-4 flex items-center justify-between rounded-md border p-3 text-sm">
      <p className="text-muted-foreground">
        Page {meta.current_page} of {meta.last_page} • Total {meta.total}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrev || isLoading}
          onClick={() => onPageChange(meta.current_page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext || isLoading}
          onClick={() => onPageChange(meta.current_page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
