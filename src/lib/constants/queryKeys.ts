export const queryKeys = {
  dashboard: ['dashboard'] as const,
  categories: {
    all: ['categories'] as const,
    byId: (id: string | number) => ['categories', id] as const,
  },
  products: {
    all: ['products'] as const,
    byId: (id: string | number) => ['products', id] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
    byId: (id: string | number) => ['suppliers', id] as const,
    ledger: (id: string | number) => ['suppliers', id, 'ledger'] as const,
  },
  customers: {
    all: ['customers'] as const,
    byId: (id: string | number) => ['customers', id] as const,
    ledger: (id: string | number) => ['customers', id, 'ledger'] as const,
  },
  purchases: {
    all: ['purchases'] as const,
    byId: (id: string | number) => ['purchases', id] as const,
  },
  sales: {
    all: ['sales'] as const,
    byId: (id: string | number) => ['sales', id] as const,
  },
  customerPayments: {
    all: ['customer-payments'] as const,
    byId: (id: string | number) => ['customer-payments', id] as const,
  },
  supplierPayments: {
    all: ['supplier-payments'] as const,
    byId: (id: string | number) => ['supplier-payments', id] as const,
  },
} as const