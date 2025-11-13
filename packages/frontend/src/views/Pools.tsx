import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePools } from '@/hooks/usePools'
import { formatAddress, formatNumber, formatCompactNumber } from '@/utils/format'
import Loading from '@/components/Loading'

export default function Pools() {
  const { t } = useTranslation()
  const {
    pools,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    fetchPools,
    getUserPositions,
  } = usePools()

  const [showUserPools, setShowUserPools] = useState(false)

  useEffect(() => {
    fetchPools()
  }, [fetchPools])

  const displayPools = showUserPools ? getUserPositions() : pools

  if (isLoading && pools.length === 0) {
    return <Loading text={t('common.loading')} fullScreen />
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-dark rounded-2xl shadow-glow-lg p-4 sm:p-6 border border-white/30">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gradient-cyan">{t('pools.title')}</h1>
          <button
            onClick={() => setShowUserPools(!showUserPools)}
            className="px-4 py-2 text-sm sm:text-base bg-gradient-tech text-white rounded-xl hover:shadow-glow active:scale-95 transition-all duration-200 touch-manipulation whitespace-nowrap"
          >
            {showUserPools ? t('pools.showAllPools') : t('pools.showMyPools')}
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 sm:mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pools.searchByTokenPair')}
            className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-white/30 rounded-xl glass focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 touch-manipulation transition-all duration-200"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50/80 border border-red-200/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm sm:text-base text-red-800 break-words">{error}</p>
          </div>
        )}

        {displayPools.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-slate-600 text-base sm:text-lg">
              {showUserPools
                ? t('pools.noLiquidityPositions')
                : searchQuery
                ? t('pools.noPoolsFound')
                : t('pools.noPoolsAvailable')}
            </p>
            {!showUserPools && (
              <button
                onClick={fetchPools}
                className="mt-4 px-4 py-2 text-sm sm:text-base bg-gradient-tech text-white rounded-xl hover:shadow-glow active:scale-95 transition-all duration-200 touch-manipulation"
              >
                {t('common.refresh')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl">
              <table className="min-w-full divide-y divide-white/20">
                <thead className="glass">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      {t('pools.pool')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      {t('pools.tokenAReserve')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      {t('pools.tokenBReserve')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      {t('pools.totalLiquidity')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      {t('pools.fee')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      {t('pools.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {displayPools.map((pool, index) => (
                    <tr key={index} className="hover:bg-white/30 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-slate-800">
                            {formatAddress(pool.tokenA)} / {formatAddress(pool.tokenB)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatCompactNumber(pool.reserveA)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatCompactNumber(pool.reserveB)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatCompactNumber(pool.totalLiquidity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatNumber(pool.fee)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-primary-600 hover:text-primary-700 active:text-primary-800 touch-manipulation transition-colors duration-200">
                          {t('common.viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {displayPools.map((pool, index) => (
                <div key={index} className="glass rounded-xl p-4 border border-white/30 shadow-sm hover:shadow-glow transition-all duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-slate-800 mb-1">
                        {formatAddress(pool.tokenA)} / {formatAddress(pool.tokenB)}
                      </h3>
                      <p className="text-xs text-slate-500">{t('pools.fee')}: {formatNumber(pool.fee)}%</p>
                    </div>
                    <button className="text-primary-600 text-sm font-medium active:text-primary-700 touch-manipulation transition-colors duration-200">
                      {t('common.details')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">{t('pools.tokenAReserve')}</p>
                      <p className="text-slate-800 font-medium">{formatCompactNumber(pool.reserveA)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">{t('pools.tokenBReserve')}</p>
                      <p className="text-slate-800 font-medium">{formatCompactNumber(pool.reserveB)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500 mb-1">{t('pools.totalLiquidity')}</p>
                      <p className="text-slate-800 font-medium">{formatCompactNumber(pool.totalLiquidity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {isLoading && pools.length > 0 && (
          <div className="mt-4 text-center">
            <Loading size="sm" text={t('common.loading')} />
          </div>
        )}
      </div>
    </div>
  )
}
