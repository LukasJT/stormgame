import { getLocale } from './i18n'

export function formatDamage(dollars: number) {
  const amounts = [
    { value: 1_000_000_000_000, name: 'trillion' },
    { value: 1_000_000_000, name: 'billion' },
    { value: 1_000_000, name: 'million' },
  ]
  const unit = amounts.find(({ value }) => dollars >= value || (value > 1_000_000 && dollars >= value * .999995))
  const locale = getLocale()
  if (locale !== 'en') {
    const amount = unit ? dollars / unit.value : Math.floor(dollars)
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: unit ? 2 : 0 }).format(amount)
    const labels = locale === 'fr' ? { million: 'millions', billion: 'milliards', trillion: 'billions' }
      : { million: 'millones', billion: 'mil millones', trillion: 'billones' }
    return `${number}${unit ? ' ' + labels[unit.name as keyof typeof labels] : ''} $`
  }
  return unit ? `$${(dollars / unit.value).toFixed(2)} ${unit.name}` : `$${Math.floor(dollars)}`
}
