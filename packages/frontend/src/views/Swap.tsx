import { useState } from 'react'
import { useAccount } from 'wagmi'

export default function Swap() {
  const { isConnected } = useAccount()
  const [tokenIn, setTokenIn] = useState('')
  const [tokenOut, setTokenOut] = useState('')
  const [amountIn, setAmountIn] = useState('')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Swap Tokens</h1>
        
        {!isConnected && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800">Please connect your wallet to swap tokens</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!isConnected}
              />
              <select
                value={tokenIn}
                onChange={(e) => setTokenIn(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!isConnected}
              >
                <option value="">Select token</option>
                <option value="BNB">BNB</option>
                <option value="BUSD">BUSD</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
          </div>

          <div className="flex justify-center">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              ↓
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value="0.0"
                placeholder="0.0"
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <select
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!isConnected}
              >
                <option value="">Select token</option>
                <option value="BNB">BNB</option>
                <option value="BUSD">BUSD</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
          </div>

          <button
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!isConnected || !tokenIn || !tokenOut || !amountIn}
          >
            {!isConnected ? 'Connect Wallet' : 'Swap'}
          </button>
        </div>
      </div>
    </div>
  )
}

