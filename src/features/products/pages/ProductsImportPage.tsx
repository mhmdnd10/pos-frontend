import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { routePaths } from '@/app/router/routePaths'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'
import { productService } from '@/features/products/services/productService'

export function ProductsImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const importMutation = useMutation({
    mutationFn: productService.import,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      toast.success('Products import queued successfully. Check Products page after processing.')
      setFile(null)
      navigate(routePaths.products)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to import products.')),
  })

  return (
    <div className="max-w-2xl">
      <PageHeader title="Import Products" description="Upload Excel file (.xlsx or .xls) to /api/products/import" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null
              setFile(selected)
            }}
          />
          <p className="text-xs text-muted-foreground">Select an Excel file (.xlsx or .xls) before importing.</p>
          <Button
            type="button"
            disabled={importMutation.isPending}
            onClick={() => {
              if (!file) {
                toast.error('Please choose an Excel file first.')
                return
              }

              importMutation.mutate(file)
            }}
          >
            <Upload className="h-4 w-4" />
            {importMutation.isPending ? 'Uploading...' : 'Import'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
