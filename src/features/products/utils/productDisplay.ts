interface ProductDisplaySource {
  id?: number | string | null
  name?: string | null
  brand?: string | null
  color?: string | null
  size?: string | null
}

export function buildProductDisplayName(source: ProductDisplaySource) {
  const baseName = typeof source.name === 'string' ? source.name.trim() : ''
  const brand = typeof source.brand === 'string' ? source.brand.trim() : ''
  const color = typeof source.color === 'string' ? source.color.trim() : ''
  const size = typeof source.size === 'string' ? source.size.trim() : ''

  const suffixParts = [brand, color, size].filter((part) => part.length > 0)

  if (baseName.length > 0 && suffixParts.length > 0) {
    return `${baseName} - ${suffixParts.join(' - ')}`
  }

  if (baseName.length > 0) {
    return baseName
  }

  const id = Number(source.id)
  if (Number.isFinite(id) && id > 0) {
    return `Product #${id}`
  }

  return 'Product'
}
