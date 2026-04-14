export const endpoints = {
  auth: {
    register: '/api/register',
    login: '/api/login',
    forgotPassword: '/api/forgot-password',
    resetPassword: '/api/reset-password',
    logout: '/api/logout',
    changePassword: '/api/change-password',
  },
  dashboard: '/api/dashboard',
  categories: {
    list: '/api/categories',
    byId: (id: string | number) => `/api/categories/${id}`,
  },
  products: {
    list: '/api/products',
    filters: '/api/products/filters',
    byId: (id: string | number) => `/api/products/${id}`,
    import: '/api/products/import',
  },
  suppliers: {
    list: '/api/suppliers',
    byId: (id: string | number) => `/api/suppliers/${id}`,
    ledger: (id: string | number) => `/api/suppliers/${id}/ledger`,
  },
  purchases: {
    list: '/api/purchases',
    byId: (id: string | number) => `/api/purchases/${id}`,
  },
  sales: {
    list: '/api/sales',
    byId: (id: string | number) => `/api/sales/${id}`,
    invoiceNumber: (id: string | number) => `/api/sales/invoice/${id}`,
    byInvoice: (invoiceNumber: string) => `/api/sales/invoice/${encodeURIComponent(invoiceNumber)}`,
    updateByInvoice: (invoiceNumber: string) => `/api/sales/invoice/${encodeURIComponent(invoiceNumber)}`,
    quickReturn: '/api/sales/quick-return',
  },
  customers: {
    list: '/api/customers',
    byId: (id: string | number) => `/api/customers/${id}`,
    ledger: (id: string | number) => `/api/customers/${id}/ledger`,
  },
  customerPayments: {
    list: '/api/customer-payments',
    byId: (id: string | number) => `/api/customer-payments/${id}`,
  },
  supplierPayments: {
    list: '/api/supplier-payments',
    byId: (id: string | number) => `/api/supplier-payments/${id}`,
  },
  reports: {
    dailySummary: '/api/reports/daily-summary',
    monthlySummary: '/api/reports/monthly-summary',
  },
  archives: '/api/archives',
} as const