import { useEffect, useState } from 'react'
import { usePools } from '@/hooks/usePools'
import { formatAddress, formatNumber, formatCompactNumber } from '@/utils/format'
import Loading from '@/components/Loading'

export default function Pools() {
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
    return <Loading text="Loading pools..." fullScreen />
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Liquidity Pools</h1>
          <button
            onClick={() => setShowUserPools(!showUserPools)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {showUserPools ? 'Show All Pools' : 'Show My Pools'}
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by token pair..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {displayPools.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              {showUserPools
                ? "You don't have any liquidity positions"
                : searchQuery
                ? 'No pools found matching your search'
                : 'No pools available'}
            </p>
            {!showUserPools && (
              <button
                onClick={fetchPools}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pool
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token A Reserve
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token B Reserve
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Liquidity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayPools.map((pool, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {formatAddress(pool.tokenA)} / {formatAddress(pool.tokenB)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCompactNumber(pool.reserveA)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCompactNumber(pool.reserveB)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCompactNumber(pool.totalLiquidity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(pool.fee)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isLoading && pools.length > 0 && (
          <div className="mt-4 text-center">
            <Loading size="sm" text="Refreshing..." />
          </div>
        )}
      </div>
    </div>
  )
}
