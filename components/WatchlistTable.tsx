"use client";

import Link from "next/link";
import WatchlistButton from "@/components/WatchlistButton";
import { WATCHLIST_TABLE_HEADER } from "@/lib/constants";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WatchlistTable({ watchlist: initialWatchlist }: WatchlistTableProps) {
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const router = useRouter();

  const handleWatchlistChange = (symbol: string, isAdded: boolean) => {
    if (!isAdded) {
      // Remove from local state immediately for better UX
      setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
      // Refresh the page data
      router.refresh();
    }
  };

  if (watchlist.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-800">
            {WATCHLIST_TABLE_HEADER.map((header) => (
              <th
                key={header}
                className="text-left py-4 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {watchlist.map((stock) => (
            <tr
              key={stock.symbol}
              className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors"
            >
              <td className="py-4 px-4">
                <Link
                  href={`/stocks/${stock.symbol}`}
                  className="text-gray-100 hover:text-yellow-500 font-medium transition-colors"
                >
                  {stock.company}
                </Link>
              </td>
              <td className="py-4 px-4">
                <Link
                  href={`/stocks/${stock.symbol}`}
                  className="text-gray-300 hover:text-yellow-500 transition-colors"
                >
                  {stock.symbol}
                </Link>
              </td>
              <td className="py-4 px-4 text-gray-300">
                {stock.priceFormatted}
              </td>
              <td className="py-4 px-4">
                <span
                  className={`${
                    stock.changePercent && stock.changePercent > 0
                      ? "text-green-500"
                      : stock.changePercent && stock.changePercent < 0
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  {stock.changeFormatted}
                </span>
              </td>
              <td className="py-4 px-4 text-gray-300">{stock.marketCap}</td>
              <td className="py-4 px-4 text-gray-300">{stock.peRatio}</td>
              <td className="py-4 px-4">
                <button className="text-gray-400 hover:text-yellow-500 transition-colors text-sm">
                  Set Alert
                </button>
              </td>
              <td className="py-4 px-4">
                <WatchlistButton
                  symbol={stock.symbol}
                  company={stock.company}
                  isInWatchlist={true}
                  showTrashIcon={true}
                  onWatchlistChange={handleWatchlistChange}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
