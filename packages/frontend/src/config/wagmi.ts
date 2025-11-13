import { createConfig, http } from 'wagmi'
import { bsc, bscTestnet } from 'wagmi/chains'
import { walletConnect, injected } from 'wagmi/connectors'

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'your-project-id'

export const wagmiConfig = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    walletConnect({ projectId }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
})

