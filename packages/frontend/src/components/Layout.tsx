import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { WalletConnect } from '@chatoneswap/wallet'
import LanguageSwitcher from './LanguageSwitcher'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useTranslation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-dark shadow-sm sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center">
              <Link to="/" className="text-xl sm:text-2xl font-bold text-gradient-cyan">
                ChatOneSwap
              </Link>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex md:ml-8 md:space-x-2">
                <Link
                  to="/swap"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/swap') || isActive('/')
                      ? 'bg-gradient-tech text-white shadow-glow'
                      : 'text-slate-600 hover:bg-white/50 hover:text-primary-600'
                  }`}
                >
                  {t('nav.swap')}
                </Link>
                <Link
                  to="/liquidity"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/liquidity')
                      ? 'bg-gradient-tech text-white shadow-glow'
                      : 'text-slate-600 hover:bg-white/50 hover:text-primary-600'
                  }`}
                >
                  {t('nav.liquidity')}
                </Link>
                <Link
                  to="/pools"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/pools')
                      ? 'bg-gradient-tech text-white shadow-glow'
                      : 'text-slate-600 hover:bg-white/50 hover:text-primary-600'
                  }`}
                >
                  {t('nav.pools')}
                </Link>
              </nav>
            </div>

            {/* Desktop Wallet Connect & Language Switcher */}
            <div className="hidden md:flex md:items-center md:space-x-3">
              <LanguageSwitcher />
              <WalletConnect 
                connectLabel={t('common.connectWallet')}
                disconnectLabel={t('common.disconnect')}
                showAddress={true}
                addressFormat="short"
              />
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center space-x-2 md:hidden">
              <WalletConnect 
                connectLabel={t('common.connectWallet')}
                disconnectLabel={t('common.disconnect')}
                showAddress={false}
                containerClassName="flex items-center"
                connectClassName="px-3 py-1.5 text-sm bg-gradient-tech text-white rounded-lg shadow-glow"
                disconnectClassName="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg"
              />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                aria-label="Toggle menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                  <div className="md:hidden border-t border-white/20 py-4">
                    <div className="mb-4 px-4">
                      <LanguageSwitcher />
                    </div>
                    <nav className="flex flex-col space-y-2">
                      <Link
                        to="/swap"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-4 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                          isActive('/swap') || isActive('/')
                            ? 'bg-gradient-tech text-white shadow-glow'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                      >
                        {t('nav.swap')}
                      </Link>
                      <Link
                        to="/liquidity"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-4 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                          isActive('/liquidity')
                            ? 'bg-gradient-tech text-white shadow-glow'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                      >
                        {t('nav.liquidity')}
                      </Link>
                      <Link
                        to="/pools"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-4 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                          isActive('/pools')
                            ? 'bg-gradient-tech text-white shadow-glow'
                            : 'text-slate-600 hover:bg-white/50'
                        }`}
                      >
                        {t('nav.pools')}
                      </Link>
                    </nav>
                  </div>
                )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  )
}

