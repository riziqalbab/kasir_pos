import React, { useState } from 'react'
import { Listbox } from '@headlessui/react'
import { IconChevronDown, IconCircle, IconCircleFilled } from '@tabler/icons-react'

export default function InputSelect({ selected, data = [], setSelected, label, errors, placeholder, multiple = false, searchable = false, displayKey = 'name' }) {
    const [search, setSearch] = useState('')

    const filteredData = (data || []).filter(item =>
        item[displayKey]?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className='relative flex flex-col gap-2'>
            {label && <label className='text-slate-600 dark:text-slate-400 text-sm font-medium'>{label}</label>}
            <Listbox value={selected} onChange={setSelected} multiple={multiple} by="id">
                <Listbox.Button className={'w-full px-3 py-2 border text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 flex justify-between items-center gap-4 bg-white text-slate-800 border-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-800 transition-all'}>
                    <span className="truncate">
                        {multiple ? (
                            selected && selected.length > 0 ? selected.map(item => item[displayKey]).join(', ') : placeholder
                        ) : (
                            selected ? selected[displayKey] : placeholder
                        )}
                    </span>
                    <IconChevronDown size={18} strokeWidth={1.5} className="shrink-0 text-slate-400" />
                </Listbox.Button>
                <Listbox.Options className={'absolute z-50 left-0 right-0 top-full mt-1 p-2 border rounded-xl flex flex-col gap-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto shadow-xl'}>
                    {searchable && (
                        <div className="sticky top-0 z-10 pb-2 bg-white dark:bg-slate-900">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="Cari..."
                                className="w-full px-3 py-1.5 text-sm border rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    )}
                    {filteredData.length > 0 ? (
                        filteredData.map((item) => (
                            <Listbox.Option key={item.id} value={item}>
                                {({ selected }) => (
                                    <div
                                        className={`text-sm cursor-pointer px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                                            selected
                                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400 font-medium'
                                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {selected ? <IconCircleFilled size={15} strokeWidth={1.5} className='text-primary-500 shrink-0' /> : <IconCircle size={15} strokeWidth={1.5} className="shrink-0 text-slate-400" />}
                                        <span className="truncate">{item[displayKey]}</span>
                                    </div>
                                )}
                            </Listbox.Option>
                        ))
                    ) : (
                        <div className="p-3 text-xs text-center text-slate-400 dark:text-slate-500">
                            Tidak ada data
                        </div>
                    )}
                </Listbox.Options>
            </Listbox>
            {errors && (
                <small className='text-xs text-danger-500 font-medium'>{errors}</small>
            )}
        </div>
    )
}
