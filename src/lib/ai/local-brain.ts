import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks } from 'date-fns'

interface IntentResult {
    matched: boolean
    response?: string
    data?: any
}

export class LocalBrain {

    static async processQuery(query: string, userId: string): Promise<string> {
        const lowerQuery = query.toLowerCase()
        const context = { userId, query: lowerQuery }

        // 1. GREETINGS & PERSONALITY
        if (this.matches(lowerQuery, [/hello/, /hi\b/, /hey/, /good morning/])) {
            return "Hello! I'm ready to help. Ask me about sales, staff, or inventory."
        }

        // 2. REVENUE / SALES INTELLIGENCE
        if (this.matches(lowerQuery, [/revenue/, /sales/, /how much/, /earnings/, /money/])) {
            return await this.handleRevenue(lowerQuery)
        }

        // 3. QUEUE / WAIT TIMES
        if (this.matches(lowerQuery, [/queue/, /wait/, /busy/, /line/, /customers waiting/])) {
            return await this.handleQueue()
        }

        // 4. STAFF / PERFORMANCE
        if (this.matches(lowerQuery, [/staff/, /employee/, /stylist/, /working/, /who sold/])) {
            return await this.handleStaff(lowerQuery)
        }

        // 5. INVENTORY
        if (this.matches(lowerQuery, [/stock/, /inventory/, /low/, /product/, /running out/])) {
            return await this.handleInventory(lowerQuery)
        }

        // 6. CLIENTS / TRAFFIC
        if (this.matches(lowerQuery, [/client/, /customer/, /new people/, /busy/, /traffic/])) {
            return await this.handleClients(lowerQuery)
        }

        // 7. GOALS
        if (this.matches(lowerQuery, [/goal/, /target/])) {
            return await this.handleGoals(userId)
        }

        // Fallback for "Real" feeling (don't just say "I don't know")
        return "I'm analyzing that... I can tell you about Sales, Staff Performance, and Inventory levels. Try asking: 'Who is the top stylist today?'"
    }

    // --- HANDLERS ---

    private static async handleRevenue(query: string): Promise<string> {
        let start = startOfDay(new Date())
        let end = endOfDay(new Date())
        let periodName = "today"

        // Timeframe parsing
        if (query.includes('yesterday')) {
            start = startOfDay(subDays(new Date(), 1))
            end = endOfDay(subDays(new Date(), 1))
            periodName = "yesterday"
        } else if (query.includes('week')) {
            start = startOfWeek(new Date())
            end = endOfWeek(new Date())
            periodName = "this week"
        } else if (query.includes('month')) {
            start = startOfMonth(new Date())
            end = endOfMonth(new Date())
            periodName = "this month"
        }

        const transactions = await prisma.transaction.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                status: 'COMPLETED'
            }
        })

        const total = transactions.reduce((sum, tx) => sum + Number(tx.total), 0)
        const count = transactions.length

        if (count === 0) return `No sales recorded for ${periodName}.`

        // Smart Insight: Average Ticket
        const avgTicket = (total / count).toFixed(2)
        return `Revenue for ${periodName} is $${total.toFixed(2)} across ${count} transactions. Average sale: $${avgTicket}.`
    }

    private static async handleQueue(): Promise<string> {
        // @ts-ignore (CheckIn model exists)
        const queue = await prisma.checkIn.findMany({
            where: { status: 'WAITING' },
            include: { client: true },
            orderBy: { checkedInAt: 'asc' }
        })

        if (queue.length === 0) return "The queue is currently empty. Good time for walk-ins!"

        const names = queue.map((q: any) => q.client.firstName).join(', ')
        return `There are ${queue.length} people waiting: ${names}. The estimated wait time is ${(queue.length * 15)} minutes.`
    }

    private static async handleStaff(query: string): Promise<string> {
        // Top Stylist logic
        const start = startOfDay(new Date())
        const transactions = await prisma.transaction.findMany({
            where: { createdAt: { gte: start }, status: 'COMPLETED' },
            include: { employee: true } // Assuming 'employee' relation exists
        })

        if (transactions.length === 0) return "No staff activity recorded today yet."

        const salesByStaff: Record<string, number> = {}
        transactions.forEach(tx => {
            const name = tx.employee?.name || 'Unknown'
            salesByStaff[name] = (salesByStaff[name] || 0) + Number(tx.total)
        })

        // Find top
        const sorted = Object.entries(salesByStaff).sort((a, b) => b[1] - a[1])
        const top = sorted[0]

        if (query.includes('top') || query.includes('best')) {
            return `${top[0]} is leading today with $${top[1].toFixed(2)} in sales.`
        }

        return `Staff Performance Today: ` + sorted.map(([name, val]) => `${name}: $${val.toFixed(0)}`).join(', ')
    }

    private static async handleInventory(query: string): Promise<string> {
        // Low Stock Logic
        const lowStock = await prisma.product.findMany({
            where: { stock: { lte: 5 } }, // Hardcoded threshold for now
            take: 5
        })

        if (lowStock.length === 0) return "Inventory looks healthy! No items are critically low."

        const items = lowStock.map(p => `${p.name} (${p.stock})`).join(', ')
        return `Alert: ${lowStock.length} items are running low: ${items}.`
    }

    private static async handleClients(query: string): Promise<string> {
        const start = startOfDay(new Date())
        const newClients = await prisma.client.count({
            where: { createdAt: { gte: start } }
        })

        const totalClients = await prisma.client.count()

        return `We have ${totalClients} total clients. Today, we added ${newClients} new faces.`
    }

    private static async handleGoals(userId: string): Promise<string> {
        const user = await prisma.user.findUnique({ where: { id: userId } }) ||
            await prisma.user.findUnique({ where: { email: userId } }) // fallback if email passed

        if (!user?.dailyGoal) return "You haven't set a daily goal yet."

        // Calculate progress
        const start = startOfDay(new Date())
        const transactions = await prisma.transaction.findMany({
            where: {
                createdAt: { gte: start },
                status: 'COMPLETED',
                employeeId: user.id
            }
        })
        const total = transactions.reduce((sum, tx) => sum + Number(tx.total), 0)
        const percent = Math.round((total / user.dailyGoal) * 100)

        return `Your goal is $${user.dailyGoal}. You've made $${total} (${percent}%).`
    }

    // --- HELPER ---
    private static matches(text: string, patterns: RegExp[]): boolean {
        return patterns.some(p => p.test(text))
    }
}
