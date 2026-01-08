'use client'

import type { LotteryStats } from './types'

interface PulseLotteryTabProps {
    lotteryStats: LotteryStats
    onSellTicket?: () => void
    onPayWinner?: () => void
}

export default function PulseLotteryTab({
    lotteryStats,
    onSellTicket,
    onPayWinner
}: PulseLotteryTabProps) {
    return (
        <>
            {/* Lottery Summary Header */}
            <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 rounded-2xl p-4 mb-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-purple-100 text-xs font-medium uppercase">🎰 Lottery Today</p>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white">Separate Accounting</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                        <p className="text-purple-200 text-[10px]">TICKETS SOLD</p>
                        <p className="text-xl font-black text-white">+${lotteryStats.sales.toFixed(2)}</p>
                        <p className="text-purple-300 text-[10px]">{lotteryStats.salesCount} sales</p>
                    </div>
                    <div>
                        <p className="text-purple-200 text-[10px]">PAYOUTS</p>
                        <p className="text-xl font-black text-red-300">-${lotteryStats.payouts.toFixed(2)}</p>
                        <p className="text-purple-300 text-[10px]">{lotteryStats.payoutsCount} winners</p>
                    </div>
                    <div>
                        <p className="text-purple-200 text-[10px]">NET</p>
                        <p className={`text-xl font-black ${lotteryStats.net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                            {lotteryStats.net >= 0 ? '+' : ''}${lotteryStats.net.toFixed(2)}
                        </p>
                        <p className="text-purple-300 text-[10px]">Cash Flow</p>
                    </div>
                </div>
            </div>

            {/* Scratch Tickets Sold */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-purple-300">
                    🎟️ Scratch Tickets Sold
                </h3>
                {lotteryStats.topGames && lotteryStats.topGames.length > 0 ? (
                    <div className="space-y-2">
                        {lotteryStats.topGames.map((game, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-purple-500/10 rounded-lg px-3 py-3 border border-purple-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                                        <span className="text-purple-300 font-bold">${game.price}</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{game.name}</p>
                                        <p className="text-gray-400 text-xs">${game.price} per ticket</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-400 font-bold">{game.sold}</p>
                                    <p className="text-gray-500 text-xs">sold</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <span className="text-4xl">🎟️</span>
                        <p className="text-gray-500 mt-2">No scratch tickets sold today</p>
                    </div>
                )}
            </div>

            {/* Recent Lottery Transactions */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-purple-300">
                    📜 Recent Activity
                </h3>
                {(lotteryStats.salesCount > 0 || lotteryStats.payoutsCount > 0) ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">💵</span>
                                <span className="text-white text-sm">Ticket Sales</span>
                            </div>
                            <span className="text-green-400 font-bold">{lotteryStats.salesCount} transactions</span>
                        </div>
                        <div className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="text-red-400">🏆</span>
                                <span className="text-white text-sm">Winner Payouts</span>
                            </div>
                            <span className="text-red-400 font-bold">{lotteryStats.payoutsCount} payouts</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm text-center py-4">No lottery activity today</p>
                )}
            </div>

            {/* Lottery Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={onSellTicket}
                    className="bg-green-600/20 border border-green-500/30 rounded-xl p-4 text-center active:scale-95 transition-transform"
                >
                    <span className="text-2xl">🎫</span>
                    <p className="text-green-400 font-medium mt-1 text-sm">Sell Ticket</p>
                    <p className="text-gray-500 text-xs">Record sale</p>
                </button>
                <button
                    onClick={onPayWinner}
                    className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 text-center active:scale-95 transition-transform"
                >
                    <span className="text-2xl">🏆</span>
                    <p className="text-red-400 font-medium mt-1 text-sm">Pay Winner</p>
                    <p className="text-gray-500 text-xs">Record payout</p>
                </button>
            </div>
        </>
    )
}
