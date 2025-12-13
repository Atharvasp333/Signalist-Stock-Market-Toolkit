'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    // Better Auth stores users in the "user" collection
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || '');
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error('getWatchlistSymbolsByEmail error:', err);
    return [];
  }
}

export async function addToWatchlist(symbol: string, company: string): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const userId = session.user.id;
    const upperSymbol = symbol.toUpperCase();

    // Check if already exists
    const existing = await Watchlist.findOne({ userId, symbol: upperSymbol });
    if (existing) {
      return { success: false, message: 'Already in watchlist' };
    }

    await Watchlist.create({
      userId,
      symbol: upperSymbol,
      company,
      addedAt: new Date(),
    });

    revalidatePath('/watchlist');
    revalidatePath(`/stocks/${upperSymbol}`);

    return { success: true, message: 'Added to watchlist' };
  } catch (err) {
    console.error('addToWatchlist error:', err);
    return { success: false, message: 'Failed to add to watchlist' };
  }
}

export async function removeFromWatchlist(symbol: string): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();

    const userId = session.user.id;
    const upperSymbol = symbol.toUpperCase();

    const result = await Watchlist.deleteOne({ userId, symbol: upperSymbol });

    if (result.deletedCount === 0) {
      return { success: false, message: 'Not found in watchlist' };
    }

    revalidatePath('/watchlist');
    revalidatePath(`/stocks/${upperSymbol}`);

    return { success: true, message: 'Removed from watchlist' };
  } catch (err) {
    console.error('removeFromWatchlist error:', err);
    return { success: false, message: 'Failed to remove from watchlist' };
  }
}

export async function getUserWatchlist(): Promise<StockWithData[]> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return [];
    }

    await connectToDatabase();

    const userId = session.user.id;
    const items = await Watchlist.find({ userId }).sort({ addedAt: -1 }).lean();

    // Fetch stock data for each symbol
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    
    const stocksWithData = await Promise.all(
      items.map(async (item) => {
        try {
          // Fetch quote data
          const quoteRes = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${item.symbol}&token=${FINNHUB_API_KEY}`,
            { cache: 'no-store' }
          );
          const quote = await quoteRes.json() as QuoteData;

          // Fetch profile data for market cap and PE ratio
          const profileRes = await fetch(
            `https://finnhub.io/api/v1/stock/metric?symbol=${item.symbol}&metric=all&token=${FINNHUB_API_KEY}`,
            { cache: 'no-store' }
          );
          const metrics = await profileRes.json() as FinancialsData;

          const currentPrice = quote.c || 0;
          const changePercent = quote.dp || 0;
          const marketCap = metrics.metric?.marketCapitalization || 0;
          const peRatio = metrics.metric?.peNormalizedAnnual || 0;

          return {
            userId: item.userId,
            symbol: item.symbol,
            company: item.company,
            addedAt: item.addedAt,
            currentPrice,
            changePercent,
            priceFormatted: currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : 'N/A',
            changeFormatted: changePercent !== 0 ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%` : 'N/A',
            marketCap: marketCap > 0 ? `$${(marketCap / 1000).toFixed(2)}B` : 'N/A',
            peRatio: peRatio > 0 ? peRatio.toFixed(2) : 'N/A',
          };
        } catch (err) {
          console.error(`Error fetching data for ${item.symbol}:`, err);
          return {
            userId: item.userId,
            symbol: item.symbol,
            company: item.company,
            addedAt: item.addedAt,
            currentPrice: 0,
            changePercent: 0,
            priceFormatted: 'N/A',
            changeFormatted: 'N/A',
            marketCap: 'N/A',
            peRatio: 'N/A',
          };
        }
      })
    );

    return stocksWithData;
  } catch (err) {
    console.error('getUserWatchlist error:', err);
    return [];
  }
}

export async function checkWatchlistStatus(symbols: string[]): Promise<Record<string, boolean>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return {};
    }

    await connectToDatabase();

    const userId = session.user.id;
    const upperSymbols = symbols.map(s => s.toUpperCase());

    const items = await Watchlist.find(
      { userId, symbol: { $in: upperSymbols } },
      { symbol: 1 }
    ).lean();

    const statusMap: Record<string, boolean> = {};
    upperSymbols.forEach(symbol => {
      statusMap[symbol] = items.some(item => item.symbol === symbol);
    });

    return statusMap;
  } catch (err) {
    console.error('checkWatchlistStatus error:', err);
    return {};
  }
}

export async function isInWatchlist(symbol: string): Promise<boolean> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return false;
    }

    await connectToDatabase();

    const userId = session.user.id;
    const upperSymbol = symbol.toUpperCase();

    const exists = await Watchlist.exists({ userId, symbol: upperSymbol });
    return !!exists;
  } catch (err) {
    console.error('isInWatchlist error:', err);
    return false;
  }
}
