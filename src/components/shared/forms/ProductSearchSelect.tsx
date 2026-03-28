import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { productService } from '@/features/products/services/productService'
import type { Product } from '@/features/products/types'
import { queryKeys } from '@/lib/constants/queryKeys'
import { cn } from '@/lib/utils/cn'

interface ProductSearchSelectProps {
  value?: string
  onSelect: (product: Product) => void
  onClear?: () => void
  placeholder?: string
  className?: string
}

const MAX_SEARCH_PAGES = 8

function formatPrice(value: Product['sale_price'] | Product['purchase_price'] | Product['price'] | Product['cost_price']) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'
}

function getStock(product: Product) {
  if (Number.isFinite(product.stock_quantity)) {
    return Number(product.stock_quantity)
  }

  if (Number.isFinite(product.stock)) {
    return Number(product.stock)
  }

  return 0
}

function getProductLabel(product: Product) {
  return product.name || `Product #${product.id}`
}

export function ProductSearchSelect({
  value,
  onSelect,
  onClear,
  placeholder = 'Search product by name, barcode, or SKU',
  className,
}: ProductSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim())
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (!value) {
      setSelectedProduct(null)
      setSearchTerm('')
    }
  }, [value])

  const productsQuery = useQuery({
    queryKey: [...queryKeys.products.all, 'search-select', debouncedSearchTerm],
    queryFn: async () => {
      const term = debouncedSearchTerm.trim()

      if (!term) {
        return productService.list(1)
      }

      const merged = new Map<number, Product>()
      let page = 1
      let lastPage = 1

      while (page <= lastPage && page <= MAX_SEARCH_PAGES) {
        const response = await productService.list(page, { search: term })
        response.items.forEach((item) => merged.set(item.id, item))

        lastPage = response.meta?.last_page ?? page
        page += 1
      }

      // Fallback: if backend ignores search params, fetch a few pages and filter client-side.
      if (merged.size === 0) {
        page = 1
        lastPage = 1

        while (page <= lastPage && page <= MAX_SEARCH_PAGES) {
          const response = await productService.list(page)
          response.items.forEach((item) => merged.set(item.id, item))

          lastPage = response.meta?.last_page ?? page
          page += 1
        }
      }

      return {
        items: Array.from(merged.values()),
        meta: null,
      }
    },
  })

  const products = productsQuery.data?.items ?? []

  const filteredProducts = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase()

    if (term) {
      return products.filter((product) => {
        const name = product.name?.toLowerCase() ?? ''
        const barcode = (product.barcode ?? product.sku ?? '').toLowerCase()
        const categoryName = (product.category_name ?? product.category?.name ?? '').toLowerCase()
        return name.includes(term) || barcode.includes(term) || categoryName.includes(term)
      })
    }

    return products.slice(0, 10)
  }, [debouncedSearchTerm, products])

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            const next = event.target.value
            setSearchTerm(next)
            setIsOpen(true)

            if (value) {
              onClear?.()
            }
          }}
        />
      </div>

      {isOpen ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background p-1 shadow-md">
          {productsQuery.isLoading ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Searching products...</p>
          ) : null}

          {!productsQuery.isLoading && filteredProducts.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">No products found.</p>
          ) : null}

          {!productsQuery.isLoading
            ? filteredProducts.map((product) => {
                const purchasePrice = Number(product.purchase_price ?? product.cost_price ?? 0)
                const salePrice = Number(product.sale_price ?? product.price ?? 0)

                return (
                  <button
                    key={product.id}
                    type="button"
                    className="flex w-full flex-col rounded-sm px-2 py-2 text-left hover:bg-muted"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      setSelectedProduct(product)
                      setSearchTerm(getProductLabel(product))
                      setIsOpen(false)
                      onSelect(product)
                    }}
                  >
                    <span className="text-sm font-medium">{getProductLabel(product)}</span>
                    <span className="text-xs text-muted-foreground">
                      Purchase: {formatPrice(purchasePrice)} | Sale: {formatPrice(salePrice)} | Stock: {getStock(product)}
                    </span>
                  </button>
                )
              })
            : null}
        </div>
      ) : null}

      {selectedProduct ? (
        <div className="mt-2 rounded-md border bg-muted/20 px-2 py-2 text-xs text-muted-foreground">
          Purchase: {formatPrice(selectedProduct.purchase_price ?? selectedProduct.cost_price)} | Sale:{' '}
          {formatPrice(selectedProduct.sale_price ?? selectedProduct.price)} | Stock: {getStock(selectedProduct)}
        </div>
      ) : null}
    </div>
  )
}
