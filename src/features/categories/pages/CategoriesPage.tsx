import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/shared/forms/FormField'
import { PaginationControls } from '@/components/shared/pagination/PaginationControls'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { categoryService } from '@/features/categories/services/categoryService'
import type { Category } from '@/features/categories/types'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'

const categorySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
})

type CategorySchema = z.infer<typeof categorySchema>

export function CategoriesPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const createForm = useForm<CategorySchema>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '' },
  })

  const editForm = useForm<CategorySchema>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '' },
  })

  const categoriesQuery = useQuery({
    queryKey: [...queryKeys.categories.all, page, searchTerm],
    queryFn: () => categoryService.list(page, searchTerm || undefined),
  })

  const visibleCategories = useMemo(() => {
    const rows = categoriesQuery.data?.items ?? []
    const term = searchTerm.toLowerCase()

    if (!term) {
      return rows
    }

    return rows.filter((row) => {
      const name = row.name?.toLowerCase() ?? ''
      const description = (row.description ?? '').toLowerCase()
      return name.includes(term) || description.includes(term)
    })
  }, [categoriesQuery.data?.items, searchTerm])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(1)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
  }

  const createMutation = useMutation({
    mutationFn: categoryService.create,
    onSuccess: async () => {
      toast.success('Category created successfully.')
      setIsCreateOpen(false)
      createForm.reset()
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to create category.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CategorySchema }) => categoryService.update(id, payload),
    onSuccess: async () => {
      toast.success('Category updated successfully.')
      setEditing(null)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update category.')),
  })

  const deleteMutation = useMutation({
    mutationFn: categoryService.remove,
    onSuccess: async () => {
      toast.success('Category deleted successfully.')
      setDeletingId(null)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to delete category.')),
  })

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage product categories"
        actions={
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Category
          </Button>
        }
      />

      {categoriesQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading categories...</div> : null}
      {categoriesQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load categories.</div> : null}

      <div className="mb-4 max-w-md">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search categories by name"
        />
      </div>

      {categoriesQuery.data ? (
        <>
          <DataTable
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'description', header: 'Description', render: (row) => row.description ?? '-' },
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
                        editForm.reset({ name: row.name, description: row.description ?? '' })
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
            rows={visibleCategories}
            getRowId={(row) => String(row.id)}
            emptyMessage="No categories found."
          />
          <PaginationControls meta={categoriesQuery.data.meta} onPageChange={setPage} isLoading={categoriesQuery.isFetching} />
        </>
      ) : null}

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingId(null)
          }
        }}
        title="Delete category"
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
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Create Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}>
              <FormField form={createForm} name="name" label="Name" placeholder="Category name" />
              <FormField form={createForm} name="description" label="Description" placeholder="Optional description" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Edit Category #{editing.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={editForm.handleSubmit((values) => updateMutation.mutate({ id: editing.id, payload: values }))}
            >
              <FormField form={editForm} name="name" label="Name" placeholder="Category name" />
              <FormField form={editForm} name="description" label="Description" placeholder="Optional description" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
