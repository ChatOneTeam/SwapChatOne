/**
 * SEO Component
 * 
 * 动态更新页面 SEO 信息
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
}

export function SEO({ title, description, keywords, image }: SEOProps) {
  const location = useLocation()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    // 基础 SEO 信息
    const baseTitle = 'ChatOneSwap - Decentralized Exchange on BSC'
    const baseDescription = t('common.description') || 'Swap tokens, add liquidity, and trade on Binance Smart Chain'
    const baseKeywords = 'ChatOneSwap, DEX, Decentralized Exchange, BSC, Binance Smart Chain, Swap, Liquidity, DeFi'

    // 根据路由设置页面标题
    let pageTitle = baseTitle
    let pageDescription = baseDescription
    let pageKeywords = baseKeywords

    switch (location.pathname) {
      case '/swap':
      case '/':
        pageTitle = `${t('nav.swap')} - ${baseTitle}`
        pageDescription = `${t('swap.title')} - ${baseDescription}`
        pageKeywords = `${pageKeywords}, Token Swap, Exchange`
        break
      case '/liquidity':
        pageTitle = `${t('nav.liquidity')} - ${baseTitle}`
        pageDescription = `${t('liquidity.title')} - ${baseDescription}`
        pageKeywords = `${pageKeywords}, Liquidity Pool, LP Token`
        break
      case '/pools':
        pageTitle = `${t('nav.pools')} - ${baseTitle}`
        pageDescription = `${t('pools.title')} - ${baseDescription}`
        pageKeywords = `${pageKeywords}, Pool Discovery, Liquidity Pools`
        break
    }

    // 更新 title
    document.title = title || pageTitle

    // 更新 meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', description || pageDescription)
    }

    // 更新 meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]')
    if (metaKeywords) {
      metaKeywords.setAttribute('content', keywords || pageKeywords)
    }

    // 更新 Open Graph
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', title || pageTitle)
    }

    const ogDescription = document.querySelector('meta[property="og:description"]')
    if (ogDescription) {
      ogDescription.setAttribute('content', description || pageDescription)
    }

    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) {
      ogUrl.setAttribute('content', `https://swap.chatone.info${location.pathname}`)
    }

    // 更新 Twitter Card
    const twitterTitle = document.querySelector('meta[property="twitter:title"]')
    if (twitterTitle) {
      twitterTitle.setAttribute('content', title || pageTitle)
    }

    const twitterDescription = document.querySelector('meta[property="twitter:description"]')
    if (twitterDescription) {
      twitterDescription.setAttribute('content', description || pageDescription)
    }

    // 更新 canonical URL
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      canonical.setAttribute('href', `https://swap.chatone.info${location.pathname}`)
    }

    // 更新 html lang 属性
    const htmlLang = document.documentElement.getAttribute('lang')
    const langMap: Record<string, string> = {
      zh: 'zh-CN',
      en: 'en',
      ko: 'ko',
    }
    const currentLang = langMap[i18n.language] || 'en'
    if (htmlLang !== currentLang) {
      document.documentElement.setAttribute('lang', currentLang)
    }
  }, [location.pathname, i18n.language, t, title, description, keywords, image])

  return null
}

