import API from 'src/api'
import type { ZZHttpServer } from 'src/types'

export default function cmcRoutes(app: ZZHttpServer) {

  const defaultChainId = process.env.DEFAULT_CHAIN_ID
      ? Number(process.env.DEFAULT_CHAIN_ID)
      : 1

  app.get('/api/coinmarketcap/v1/markets', async (req, res) => {
    try {
      const markets: any = {}
      const marketSummarys: any =  await app.api.getMarketSummarys(defaultChainId)
      
      Object.keys(marketSummarys).forEach((market: string) => {
        const marketSummary = marketSummarys[market]
        const entry: any = {
          "trading_pairs": marketSummary.market,
          "base_currency": marketSummary.baseSymbol,
          "quote_currency": marketSummary.quoteSymbol,
          "last_price": marketSummary.lastPrice,
          "lowest_ask": marketSummary.lowestAsk,
          "highest_bid": marketSummary.highestBid,
          "base_volume": marketSummary.baseVolume,
          "quote_volume": marketSummary.quoteVolume,
          "price_change_percent_24h": marketSummary.priceChangePercent_24h,
          "highest_price_24h": marketSummary.highestPrice_24h,
          "lowest_price_24h": marketSummary.lowestPrice_24h
        }
        markets[market] = entry
      })
      res.json(markets)
    } catch (error: any) {
      console.log(error.message)
      res.send({ op: 'error', message: 'Failed to fetch markets' })
    }
  })

  app.get('/api/coinmarketcap/v1/ticker', async (req, res) => {
    try {
      const ticker: any = {}
      const lastPrices: any =  await app.api.getLastPrices(defaultChainId)
      lastPrices.forEach((price: string[]) => {
        const entry: any = {
          "last_price": price[1],
          "base_volume": price[4],
          "quote_volume": price[3],          
          "isFrozen": 0
        }
        ticker[price[0]] = entry
      })
      res.json(ticker)
    } catch (error: any) {
      console.log(error.message)
      res.send({ op: 'error', message: 'Failed to fetch ticker prices' })
    }
  })

  app.get('/api/coinmarketcap/v1/orderbook/:market_pair', async (req, res) => {
    const market = (req.params.market_pair).replace('_','-').toUpperCase()
    let depth: number = (req.query.depth) ? Number(req.query.depth) : 0
    const level: number = (req.query.level) ? Number(req.query.level) : 2
    if(![1,2,3].includes(level)) {
      res.send({ op: 'error', message: `Level: ${level} is not a valid level. Use 1, 2 or 3.` })
      return
    }

    try {
      // get data
      const liquidity = await app.api.getLiquidityPerSide(
        defaultChainId,
        market,
        depth,
        level
      )
      res.json(liquidity)
    } catch (error: any) {
      console.log(error.message)
      res.send({ op: 'error', message: `Failed to fetch orderbook for ${market}, ${error.message}` })
    }
  })

  app.get('/api/coinmarketcap/v1/trades/:market_pair', async (req, res) => {
    const market = (req.params.market_pair).replace('_','-').toUpperCase()
    try {
      const fills = await app.api.getfills(
        defaultChainId,
        market
      )

      if(fills.length === 0) {
        res.send({ op: 'error', message: `Can not find trades for ${market}` })
        return
      }

      const response: any[] = []
      fills.forEach(fill => {
        const date = new Date(fill[12])
        const entry: any = {
          "trade_id": fill[1],
          "price": fill[4],
          "base_volume": fill[5],
          "quote_volume": (fill[5] * fill[4]),
          "timestamp": date.getTime(),
          "type": (fill[3] === 's') ? 'sell' : 'buy'
        }
        response.push(entry)
      })

      res.send(response)
    } catch (error: any) {
      console.log(error.message)
      res.send({ op: 'error', message: `Failed to fetch trades for ${market}` })
    }
  })
}
