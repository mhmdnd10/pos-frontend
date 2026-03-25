type AnyRecord = Record<string, unknown>

function asText(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function firstText(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const text = asText(record[key])
    if (text) {
      return text
    }
  }

  return null
}

function textFromNestedObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const nested = value as AnyRecord
  return firstText(nested, ['name', 'full_name', 'display_name', 'title'])
}

export function getPartyDisplayName(
  record: AnyRecord,
  options: { prefix: 'customer' | 'supplier'; idKey: string; fallbackLabel: string; allowIdFallback?: boolean },
) {
  const { prefix, idKey, fallbackLabel, allowIdFallback = true } = options

  const directText = firstText(record, [
    `${prefix}_name`,
    `${prefix}Name`,
    `${prefix}_display_name`,
    `${prefix}DisplayName`,
    `${prefix}_title`,
    `${prefix}Title`,
  ])

  if (directText) {
    return directText
  }

  const nestedText = textFromNestedObject(record[prefix])
  if (nestedText) {
    return nestedText
  }

  if (allowIdFallback) {
    const idValue = record[idKey]
    if (typeof idValue === 'number' && Number.isFinite(idValue)) {
      return `${fallbackLabel} #${idValue}`
    }

    if (typeof idValue === 'string' && idValue.trim().length > 0) {
      return `${fallbackLabel} #${idValue.trim()}`
    }
  }

  return '-'
}

export function formatDisplayDate(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString()
}

export function formatDisplayAmount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return '-'
    }

    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) {
      return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parsed)
    }

    return trimmed
  }

  return '-'
}

export function formatDisplayStatus(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return '-'
  }

  return value
    .trim()
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ')
}
