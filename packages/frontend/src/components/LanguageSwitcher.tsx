/**
 * LanguageSwitcher Component
 * 
 * 语言切换组件，支持中文、英文、韩文
 */

import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid'

const languages = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[1]

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode)
  }

  return (
    <div className="relative">
      <Listbox value={currentLanguage.code} onChange={changeLanguage}>
        {({ open }) => (
          <>
            <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-white/30 glass py-2 pl-3 pr-8 text-left text-sm shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 touch-manipulation transition-all duration-200 hover:shadow-glow">
              <span className="flex items-center">
                <span className="mr-2">{currentLanguage.flag}</span>
                <span className="block truncate font-medium">{currentLanguage.name}</span>
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl glass-dark py-2 text-sm shadow-glow-lg ring-1 ring-white/20 focus:outline-none backdrop-blur-xl">
                {languages.map((language) => (
                  <Listbox.Option
                    key={language.code}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-3 pr-9 touch-manipulation transition-all duration-150 ${
                        active ? 'bg-gradient-tech/10 text-primary-700' : 'text-slate-700'
                      }`
                    }
                    value={language.code}
                  >
                    {({ selected }) => (
                      <>
                        <div className="flex items-center">
                          <span className="mr-2">{language.flag}</span>
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {language.name}
                          </span>
                        </div>
                        {selected ? (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </>
        )}
      </Listbox>
    </div>
  )
}

