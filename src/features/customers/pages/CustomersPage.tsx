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
import { customerService } from '@/features/customers/services/customerService'
import type { Customer } from '@/features/customers/types'
import { getApiErrorMessage } from '@/lib/api/response'
import { queryKeys } from '@/lib/constants/queryKeys'

const customerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
})

type CustomerSchema = z.infer<typeof customerSchema>

export function CustomersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const createForm = useForm<CustomerSchema>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', phone: '', address: '' },
  })

  const editForm = useForm<CustomerSchema>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', phone: '', address: '' },
  })

  const customersQuery = useQuery({
    queryKey: [...queryKeys.customers.all, page, searchTerm],
    queryFn: () => customerService.list(page, searchTerm || undefined),
  })

  const visibleCustomers = useMemo(() => {
    const rows = customersQuery.data?.items ?? []
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
  }, [customersQuery.data?.items, searchTerm])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(1)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
  }

  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: async () => {
      toast.success('Customer created successfully.')
      setIsCreateOpen(false)
      createForm.reset()
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to create customer.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CustomerSchema }) => customerService.update(id, payload),
    onSuccess: async () => {
      toast.success('Customer updated successfully.')
      setEditing(null)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update customer.')),
  })

  const deleteMutation = useMutation({
    mutationFn: customerService.remove,
    onSuccess: async () => {
      toast.success('Customer deleted successfully.')
      setDeletingId(null)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to delete customer.')),
  })

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer records and ledger"
        actions={
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Customer
          </Button>
        }
      />

      {customersQuery.isLoading ? <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading customers...</div> : null}
      {customersQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load customers.</div> : null}

      <div className="mb-4 max-w-md">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search customers by name or phone"
        />
      </div>

      {customersQuery.data ? (
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
                  const record = row as unknown as Record<string, unknown>
                  const raw = record.balance ?? record.current_balance
                  return raw === null || raw === undefined || raw === '' ? '-' : String(raw)
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex gap-2">
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link to={`/customers/${row.id}/ledger`}>
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
            rows={visibleCustomers}
            getRowId={(row) => String(row.id)}
            emptyMessage="No customers found."
          />
          <PaginationControls meta={customersQuery.data.meta} onPageChange={setPage} isLoading={customersQuery.isFetching} />
        </>
      ) : null}

      {isCreateOpen ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Create Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}>
              <FormField form={createForm} name="name" label="Name" placeholder="Customer name" />
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
            <CardTitle className="text-base">Edit Customer #{editing.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={editForm.handleSubmit((values) => updateMutation.mutate({ id: editing.id, payload: values }))}
            >
              <FormField form={editForm} name="name" label="Name" placeholder="Customer name" />
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
        title="Delete customer"
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
