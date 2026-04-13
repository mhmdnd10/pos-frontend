import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Upload } from 'lucide-react'
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

  function downloadCsvTemplate() {
    const headers = [
      'name',
      'barcode',
      'category_id',
      'description',
      'purchase_price',
      'sale_price',
      'stock_quantity',
      'size',
      'color',
      'brand',
      'model',
      'shelf_location',
      'image_url',
      'is_active',
      'minimum_stock_alert',
    ]

    const exampleRow = [
      'T-Shirt Basic',
      'TS-001',
      '3',
      'Cotton t-shirt',
      '12.5',
      '20',
      '50',
      'M',
      'Black',
      'UrbanWear',
      '2026',
      'A-12-3',
      'https://example.com/tshirt.jpg',
      '1',
      '5',
    ]

    const csvContent = ['\uFEFF' + headers.join(','), exampleRow.join(',')].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = 'products_import_template.csv'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

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
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null
              setFile(selected)
            }}
          />
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Select an Excel or CSV file (.xlsx, .xls, .csv) before importing.</p>
            <p>Columns expected: name (required), barcode, category_id, description, purchase_price, sale_price, stock_quantity, size, color, brand, model, shelf_location, image_url, is_active, minimum_stock_alert.</p>
            <div className="rounded-md border bg-muted/20 p-2">
              <p className="font-medium text-foreground">Excel demo</p>
              <p>Row 1 (headers): name | barcode | category_id | description | purchase_price | sale_price | stock_quantity | size | color | brand | model | shelf_location | image_url | is_active | minimum_stock_alert</p>
              <p>Row 2 (example): T-Shirt Basic | TS-001 | 3 | Cotton t-shirt | 12.5 | 20 | 50 | M | Black | UrbanWear | 2026 | A-12-3 | https://example.com/tshirt.jpg | 1 | 5</p>
            </div>
            <p>Tip: use the CSV template (UTF-8) to avoid question marks (???), then save as .xlsx/.xls before upload.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadCsvTemplate}>
              <Download className="h-4 w-4" />
              Export CSV Template
            </Button>
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
