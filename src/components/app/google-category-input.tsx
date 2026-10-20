'use client'
import { useEffect, useId, useState } from 'react'
import { useI18n } from '@/i18n/client'
import { findGooglePlaceTypes } from '@/core/providers/google-place-types'

export function GoogleCategoryInput({ id, value, onChange, className }: {
  id: string; value: string; onChange: (value: string) => void; className: string
}) {
  const { t, number } = useI18n()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const label = (type: string) => t(type.replace(/_/g, ' '))
  const matches = findGooglePlaceTypes(value, label)
  const options = matches.slice(0, 30)
  const expanded = open && options.length > 0

  useEffect(() => {
    if (expanded && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, expanded, listId])

  function select(type: string) { onChange(type); setOpen(false); setActive(-1) }

  return <div className="relative">
    <input id={id} className={className} value={value} required autoComplete="off"
      role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
      aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
      aria-describedby={`${listId}-help`} placeholder={t('Search a Google Places category…')}
      onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1) }}
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1) }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1) }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) {
          event.preventDefault(); setOpen(true)
          setActive(index => event.key === 'ArrowDown' ? Math.min(index + 1, options.length - 1) : index <= 0 ? options.length - 1 : index - 1)
        }
        if (event.key === 'Enter' && expanded && active >= 0 && options[active]) { event.preventDefault(); select(options[active]) }
      }} />
    {expanded && <ul id={listId} role="listbox" aria-label={t('Google Places categories')} className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-base p-1 shadow-xl">
      {options.map((type, index) => <li id={`${listId}-${index}`} key={type} role="option" aria-selected={active === index}
        onMouseDown={event => event.preventDefault()} onClick={() => select(type)}
        className={`cursor-pointer rounded px-3 py-2 text-sm normal-case tracking-normal ${active === index ? 'bg-lime/15 text-lime' : 'text-text hover:bg-white/5'}`}>
        <span className="block font-sans">{label(type)}</span>
        <span className="block text-[10px] text-mute">{type}</span>
      </li>)}
    </ul>}
    <p id={`${listId}-help`} className="mt-1.5 font-sans text-xs normal-case tracking-normal text-mute">
      {open && !matches.length ? t('No matching type. You can keep your own search term.') : open && matches.length > options.length
        ? t('{0} matching types. Keep typing to narrow the suggestions.', { 0: number(matches.length) })
        : t('Choose an official type or enter your own search term.')}
    </p>
  </div>
}
