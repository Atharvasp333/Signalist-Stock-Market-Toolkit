'use server';

import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { searchStocks } from './finnhub.actions';

export async function searchStocksWithWatchlist(query?: string): Promise<StockWithWatchlistStatus[]> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    
    return await searchStocks(query, userId);
  } catch (err) {
    console.error('searchStocksWithWatchlist error:', err);
    return await searchStocks(query);
  }
}
