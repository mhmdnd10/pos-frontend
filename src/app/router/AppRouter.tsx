import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { ProtectedLayout } from '@/app/layouts/ProtectedLayout'
import { routePaths } from '@/app/router/routePaths'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage'
import { CustomerPaymentDetailsPage } from '@/features/customer-payments/pages/CustomerPaymentDetailsPage'
import { CustomerPaymentsPage } from '@/features/customer-payments/pages/CustomerPaymentsPage'
import { NewCustomerPaymentPage } from '@/features/customer-payments/pages/NewCustomerPaymentPage'
import { CustomerLedgerPage } from '@/features/customers/pages/CustomerLedgerPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { ProductsImportPage } from '@/features/products/pages/ProductsImportPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { NewPurchasePage } from '@/features/purchases/pages/NewPurchasePage'
import { PurchaseDetailsPage } from '@/features/purchases/pages/PurchaseDetailsPage'
import { PurchasesPage } from '@/features/purchases/pages/PurchasesPage'
import { NewSalePage } from '@/features/sales/pages/NewSalePage'
import { SaleDetailsPage } from '@/features/sales/pages/SaleDetailsPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
import { SupplierPaymentDetailsPage } from '@/features/supplier-payments/pages/SupplierPaymentDetailsPage'
import { NewSupplierPaymentPage } from '@/features/supplier-payments/pages/NewSupplierPaymentPage'
import { SupplierPaymentsPage } from '@/features/supplier-payments/pages/SupplierPaymentsPage'
import { SupplierLedgerPage } from '@/features/suppliers/pages/SupplierLedgerPage'
import { SuppliersPage } from '@/features/suppliers/pages/SuppliersPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to={routePaths.dashboard} replace />,
  },
  {
    path: routePaths.login,
    element: <LoginPage />,
  },
  {
    path: routePaths.register,
    element: <RegisterPage />,
  },
  {
    path: routePaths.forgotPassword,
    element: <ForgotPasswordPage />,
  },
  {
    path: routePaths.resetPassword,
    element: <ResetPasswordPage />,
  },
  {
    path: routePaths.emailVerify,
    element: <VerifyEmailPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <ProtectedLayout />,
        children: [
          {
            path: routePaths.dashboard,
            element: <DashboardPage />,
          },
          {
            path: routePaths.changePassword,
            element: <ChangePasswordPage />,
          },
          {
            path: routePaths.categories,
            element: <CategoriesPage />,
          },
          {
            path: routePaths.products,
            element: <ProductsPage />,
          },
          {
            path: routePaths.productsImport,
            element: <ProductsImportPage />,
          },
          {
            path: routePaths.suppliers,
            element: <SuppliersPage />,
          },
          {
            path: '/suppliers/:id/ledger',
            element: <SupplierLedgerPage />,
          },
          {
            path: routePaths.customers,
            element: <CustomersPage />,
          },
          {
            path: '/customers/:id/ledger',
            element: <CustomerLedgerPage />,
          },
          {
            path: routePaths.purchases,
            element: <PurchasesPage />,
          },
          {
            path: routePaths.purchasesNew,
            element: <NewPurchasePage />,
          },
          {
            path: '/purchases/:id',
            element: <PurchaseDetailsPage />,
          },
          {
            path: routePaths.sales,
            element: <SalesPage />,
          },
          {
            path: routePaths.salesNew,
            element: <NewSalePage />,
          },
          {
            path: '/sales/:id',
            element: <SaleDetailsPage />,
          },
          {
            path: routePaths.customerPayments,
            element: <CustomerPaymentsPage />,
          },
          {
            path: routePaths.customerPaymentsNew,
            element: <NewCustomerPaymentPage />,
          },
          {
            path: '/customer-payments/:id',
            element: <CustomerPaymentDetailsPage />,
          },
          {
            path: routePaths.supplierPayments,
            element: <SupplierPaymentsPage />,
          },
          {
            path: routePaths.supplierPaymentsNew,
            element: <NewSupplierPaymentPage />,
          },
          {
            path: '/supplier-payments/:id',
            element: <SupplierPaymentDetailsPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={routePaths.dashboard} replace />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}