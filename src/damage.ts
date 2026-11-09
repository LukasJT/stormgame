export function formatDamage(dollars: number) {
  const amounts = [
    { value: 1_000_000_000_000, name: 'trillion' },
    { value: 1_000_000_000, name: 'billion' },
    { value: 1_000_000, name: 'million' },
  ]
  const unit = amounts.find(({ value }) => dollars >= value || (value > 1_000_000 && dollars >= value * .999995))
  return unit ? `$${(dollars / unit.value).toFixed(2)} ${unit.name}` : `$${Math.floor(dollars)}`
}
