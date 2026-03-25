import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
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
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'
import { supplierService } from '@/features/suppliers/services/supplierService'
import type { Supplier } from '@/features/suppliers/types'

const supplierSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
})

type SupplierSchema = z.infer<typeof supplierSchema>

export function SuppliersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const createForm = useForm<SupplierSchema>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', phone: '', address: '' },
  })

  const editForm = useForm<SupplierSchema>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', phone: '', address: '' },
  })

  const suppliersQuery = useQuery({
    queryKey: [...queryKeys.suppliers.all, page, searchTerm],
    queryFn: () => supplierService.list(page, searchTerm || undefined),
  })

  const visibleSuppliers = useMemo(() => {
    const rows = suppliersQuery.data?.items ?? []
    const term = searchTerm.toLowerCase()

    if (!term) {
      return rows
    }

    return rows.filter((row) => {
      const name = row.name?.toLowerCase() ?? ''
      const phone = (row.phone ?? '').toLowerCase()
      const address = (row.address ?? '').toLowerCase()
      return name.includes(term) || phone.includes(term) || address.includes(term)
    })
  }, [suppliersQuery.data?.items, searchTerm])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(1)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
  }

  const createMutation = useMutation({
    mutationFn: supplierService.create,
    onSuccess: async () => {
      toast.success('Supplier created successfully.')
      setIsCreateOpen(false)
      createForm.reset()
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to create supplier.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SupplierSchema }) => supplierService.update(id, payload),
    onSuccess: async () => {
      toast.success('Supplier updated successfully.')
      setEditing(null)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update supplier.')),
  })

  const deleteMutation = useMutation({
    mutationFn: supplierService.remove,
    onSuccess: async () => {
      toast.success('Supplier deleted successfully.')
      setDeletingId(null)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to delete supplier.')),
  })

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage supplier records and ledgers"
        actions={
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Supplier
          </Button>
        }
      />

      {suppliersQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading suppliers...</div> : null}
      {suppliersQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load suppliers.</div> : null}

      <div className="mb-4 max-w-md">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search suppliers by name or phone"
        />
      </div>

      {suppliersQuery.data ? (
        <>
          <DataTable
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'phone', header: 'Phone', render: (row) => row.phone ?? '-' },
              {
                key: 'balance',
                header: 'Balance',
                render: (row) => {
                  const raw = row.balance
                  return raw === null || raw === undefined || raw === '' ? '-' : String(raw)
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex gap-2">
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link to={`/suppliers/${row.id}/ledger`}>
                        <BookOpen className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(row)
                        editForm.reset({ name: row.name, phone: row.phone ?? '', address: row.address ?? '' })
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
            rows={visibleSuppliers}
            getRowId={(row) => String(row.id)}
            emptyMessage="No suppliers found."
          />
          <PaginationControls meta={suppliersQuery.data.meta} onPageChange={setPage} isLoading={suppliersQuery.isFetching} />
        </>
      ) : null}

      {isCreateOpen ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Create Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}>
              <FormField form={createForm} name="name" label="Name" placeholder="Supplier name" />
              <FormField form={createForm} name="phone" label="Phone" placeholder="Phone" />
              <FormField form={createForm} name="address" label="Address" placeholder="Address" />
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
            <CardTitle className="text-base">Edit Supplier #{editing.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={editForm.handleSubmit((values) => updateMutation.mutate({ id: editing.id, payload: values }))}
            >
              <FormField form={editForm} name="name" label="Name" placeholder="Supplier name" />
              <FormField form={editForm} name="phone" label="Phone" placeholder="Phone" />
              <FormField form={editForm} name="address" label="Address" placeholder="Address" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingId(null)
          }
        }}
        title="Delete supplier"
        description="This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          if (deletingId !== null) {
            deleteMutation.mutate(deletingId)
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
