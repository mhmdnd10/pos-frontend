import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { routePaths } from '@/app/router/routePaths'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/shared/forms/FormField'
import { PaginationControls } from '@/components/shared/pagination/PaginationControls'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { categoryService } from '@/features/categories/services/categoryService'
import { productService } from '@/features/products/services/productService'
import type { Product, ProductPayload } from '@/features/products/types'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'

const productSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  barcode: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  shelf_location: z.string().optional(),
  category_id: z.string().optional(),
  sale_price: z.string().min(1, 'Sale price is required'),
  purchase_price: z.string().min(1, 'Purchase price is required'),
  stock_quantity: z.string().min(1, 'Stock quantity is required'),
  description: z.string().optional(),
})

type ProductSchema = z.infer<typeof productSchema>

function resolveProductImageUrl(image: string) {
  const value = image.trim()
  if (!value) {
    return null
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000'
  const normalizedBase = configuredBase.replace(/\/api\/?$/, '').replace(/\/+$/, '')

  if (value.startsWith('/storage/')) {
    return `${normalizedBase}${value}`
  }

  if (value.startsWith('storage/')) {
    return `${normalizedBase}/${value}`
  }

  if (value.startsWith('/')) {
    return `${normalizedBase}${value}`
  }

  return `${normalizedBase}/storage/${value}`
}

function toOptionalNumber(value?: string) {
  if (!value || value.trim().length === 0) {
    return undefined
  }

  const normalizedValue = value.trim().replace(',', '.')
  const parsed = Number(normalizedValue)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toPayload(values: ProductSchema): ProductPayload {
  return {
    name: values.name,
    barcode: values.barcode,
    size: values.size,
    color: values.color,
    brand: values.brand,
    model: values.model,
    shelf_location: values.shelf_location,
    category_id: toOptionalNumber(values.category_id),
    sale_price: toOptionalNumber(values.sale_price),
    purchase_price: toOptionalNumber(values.purchase_price),
    stock_quantity: toOptionalNumber(values.stock_quantity),
    description: values.description,
  }
}

function toPayloadWithImage(values: ProductSchema, imageFile: File | null): ProductPayload {
  const payload = toPayload(values)

  if (imageFile) {
    payload.image = imageFile
  }

  return payload
}

export function ProductsPage() {
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [createImageFile, setCreateImageFile] = useState<File | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const queryClient = useQueryClient()
  const createCardRef = useRef<HTMLDivElement | null>(null)
  const editCardRef = useRef<HTMLDivElement | null>(null)

  const createForm = useForm<ProductSchema>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      barcode: '',
      size: '',
      color: '',
      brand: '',
      model: '',
      shelf_location: '',
      category_id: '',
      sale_price: '',
      purchase_price: '',
      stock_quantity: '',
      description: '',
    },
  })

  const editForm = useForm<ProductSchema>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      barcode: '',
      size: '',
      color: '',
      brand: '',
      model: '',
      shelf_location: '',
      category_id: '',
      sale_price: '',
      purchase_price: '',
      stock_quantity: '',
      description: '',
    },
  })

  const productsQuery = useQuery({
    queryKey: [...queryKeys.products.all, page, searchTerm, selectedCategoryId],
    queryFn: () =>
      productService.list(page, {
        search: searchTerm || undefined,
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : undefined,
      }),
  })

  const categoriesQuery = useQuery({
    queryKey: [...queryKeys.categories.all, 'products-category-lookup'],
    queryFn: () => categoryService.list(1),
  })

  const categoriesById = new Map((categoriesQuery.data?.items ?? []).map((category) => [category.id, category.name]))

  const visibleProducts = useMemo(() => {
    const rows = productsQuery.data?.items ?? []
    const term = searchTerm.toLowerCase().trim()
    const tokens = term.split(/\s+/).filter((token) => token.length > 0)

    if (!term) {
      return rows
    }

    return rows.filter((row) => {
      const haystack = [
        row.name,
        row.barcode,
        row.sku,
        row.category_name,
        row.category?.name,
        row.brand,
        row.model,
        row.color,
        row.size,
        row.shelf_location,
      ]
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
        .join(' ')
        .toLowerCase()

      return tokens.every((token) => haystack.includes(token))
    })
  }, [productsQuery.data?.items, searchTerm])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
  }

  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: async () => {
      toast.success('Product created successfully.')
      setIsCreateOpen(false)
      createForm.reset()
      setCreateImageFile(null)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to create product.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ProductPayload }) => productService.update(id, payload),
    onSuccess: async () => {
      toast.success('Product updated successfully.')
      setEditing(null)
      setEditImageFile(null)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update product.')),
  })

  const deleteMutation = useMutation({
    mutationFn: productService.remove,
    onSuccess: async () => {
      toast.success('Product deleted successfully.')
      setDeletingId(null)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to delete product.')),
  })

  useEffect(() => {
    if (isCreateOpen && createCardRef.current) {
      createCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isCreateOpen])

  useEffect(() => {
    if (editing && editCardRef.current) {
      editCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editing])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(1)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage product catalog and stock references"
        actions={
          <div className="flex gap-2">
            <Button asChild type="button" variant="outline">
              <Link to={routePaths.productsImport}>Import</Link>
            </Button>
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Product
            </Button>
          </div>
        }
      />

      {productsQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading products...</div> : null}
      {productsQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load products.</div> : null}

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, barcode, brand, model, color, size, or shelf"
          />
        </div>
        <div>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedCategoryId}
            onChange={(event) => {
              setSelectedCategoryId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All Categories</option>
            {(categoriesQuery.data?.items ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {productsQuery.data ? (
        <>
          <DataTable
            columns={[
              { key: 'id', header: 'ID' },
              {
                key: 'image',
                header: 'Image',
                render: (row) => {
                  const imagePath = typeof row.image === 'string' ? row.image : ''
                  const imageUrl = imagePath ? resolveProductImageUrl(imagePath) : null

                  return (
                    <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted/20">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={row.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                  )
                },
              },
              { key: 'name', header: 'Name' },
              { key: 'barcode', header: 'Barcode', render: (row) => String(row.barcode ?? row.sku ?? '-') },
              { key: 'brand', header: 'Brand', render: (row) => String(row.brand ?? '-') },
              { key: 'model', header: 'Model', render: (row) => String(row.model ?? '-') },
              { key: 'color', header: 'Color', render: (row) => String(row.color ?? '-') },
              { key: 'size', header: 'Size', render: (row) => String(row.size ?? '-') },
              { key: 'shelf_location', header: 'Shelf Location', render: (row) => String(row.shelf_location ?? '-') },
              {
                key: 'category_id',
                header: 'Category',
                render: (row) => {
                  const directName = typeof row.category_name === 'string' && row.category_name.trim().length > 0 ? row.category_name.trim() : null

                  if (directName) {
                    return directName
                  }

                  if (typeof row.category?.name === 'string' && row.category.name.trim().length > 0) {
                    return row.category.name.trim()
                  }

                  const categoryId = Number(row.category_id)
                  if (Number.isFinite(categoryId)) {
                    return categoriesById.get(categoryId) ?? '-'
                  }

                  return '-'
                },
              },
              {
                key: 'sale_price',
                header: 'Sale Price',
                render: (row) => String(row.sale_price ?? row.price ?? '-'),
              },
              {
                key: 'stock_quantity',
                header: 'Stock',
                render: (row) => String(row.stock_quantity ?? row.stock ?? '-'),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(row)
                        setEditImageFile(null)
                        editForm.reset({
                          name: row.name,
                          barcode: String(row.barcode ?? row.sku ?? ''),
                          size: String(row.size ?? ''),
                          color: String(row.color ?? ''),
                          brand: String(row.brand ?? ''),
                          model: String(row.model ?? ''),
                          shelf_location: String(row.shelf_location ?? ''),
                          category_id: row.category_id ? String(row.category_id) : '',
                          sale_price: String(row.sale_price ?? row.price ?? ''),
                          purchase_price: String(row.purchase_price ?? row.cost_price ?? ''),
                          stock_quantity: String(row.stock_quantity ?? row.stock ?? ''),
                          description: row.description ?? '',
                        })
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setDeletingId(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={visibleProducts}
            getRowId={(row) => String(row.id)}
            emptyMessage="No products found."
          />
          <PaginationControls meta={productsQuery.data.meta} onPageChange={setPage} isLoading={productsQuery.isFetching} />
        </>
      ) : null}

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingId(null)
          }
        }}
        title="Delete product"
        description="This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          if (deletingId !== null) {
            deleteMutation.mutate(deletingId)
          }
        }}
        isLoading={deleteMutation.isPending}
      />

      {isCreateOpen ? (
        <Card ref={createCardRef} className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Create Product</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={createForm.handleSubmit(
                (values) => createMutation.mutate(toPayloadWithImage(values, createImageFile)),
                () => toast.error('Please fill all required product fields.'),
              )}
            >
              <FormField form={createForm} name="name" label="Name" placeholder="Product name" />
              <FormField form={createForm} name="barcode" label="Barcode" placeholder="Barcode" />
              <FormField form={createForm} name="brand" label="Brand" placeholder="Brand" />
              <FormField form={createForm} name="model" label="Model" placeholder="Model" />
              <FormField form={createForm} name="color" label="Color" placeholder="Color" />
              <FormField form={createForm} name="size" label="Size" placeholder="Size" />
              <FormField form={createForm} name="shelf_location" label="Shelf Location" placeholder="Shelf location" />
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="create_category_id">Category</label>
                <select
                  id="create_category_id"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...createForm.register('category_id')}
                >
                  <option value="">Select category</option>
                  {(categoriesQuery.data?.items ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {createForm.formState.errors.category_id?.message ? (
                  <p className="text-xs text-destructive">{createForm.formState.errors.category_id.message}</p>
                ) : null}
              </div>
              <FormField form={createForm} name="sale_price" label="Sale Price" type="number" min="0" step="0.01" placeholder="0" />
              <FormField
                form={createForm}
                name="purchase_price"
                label="Purchase Price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
              />
              <FormField
                form={createForm}
                name="stock_quantity"
                label="Stock Quantity"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="create_image">Image</label>
                <Input
                  id="create_image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null
                    setCreateImageFile(selected)
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <FormField form={createForm} name="description" label="Description" placeholder="Optional description" />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateImageFile(null)
                    setIsCreateOpen(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <Card ref={editCardRef} className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Edit Product #{editing.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={editForm.handleSubmit(
                (values) => updateMutation.mutate({ id: editing.id, payload: toPayloadWithImage(values, editImageFile) }),
                () => toast.error('Please fill all required product fields.'),
              )}
            >
              <FormField form={editForm} name="name" label="Name" placeholder="Product name" />
              <FormField form={editForm} name="barcode" label="Barcode" placeholder="Barcode" />
              <FormField form={editForm} name="brand" label="Brand" placeholder="Brand" />
              <FormField form={editForm} name="model" label="Model" placeholder="Model" />
              <FormField form={editForm} name="color" label="Color" placeholder="Color" />
              <FormField form={editForm} name="size" label="Size" placeholder="Size" />
              <FormField form={editForm} name="shelf_location" label="Shelf Location" placeholder="Shelf location" />
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="edit_category_id">Category</label>
                <select
                  id="edit_category_id"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...editForm.register('category_id')}
                >
                  <option value="">Select category</option>
                  {(categoriesQuery.data?.items ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {editForm.formState.errors.category_id?.message ? (
                  <p className="text-xs text-destructive">{editForm.formState.errors.category_id.message}</p>
                ) : null}
              </div>
              <FormField form={editForm} name="sale_price" label="Sale Price" type="number" min="0" step="0.01" placeholder="0" />
              <FormField
                form={editForm}
                name="purchase_price"
                label="Purchase Price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
              />
              <FormField
                form={editForm}
                name="stock_quantity"
                label="Stock Quantity"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="edit_image">Image</label>
                <Input
                  id="edit_image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null
                    setEditImageFile(selected)
                  }}
                />
                <p className="text-xs text-muted-foreground">Choose a file only if you want to replace current image.</p>
              </div>
              <div className="md:col-span-2">
                <FormField form={editForm} name="description" label="Description" placeholder="Optional description" />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditImageFile(null)
                    setEditing(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
