import { prisma } from './src/lib/prisma'

async function main() {
    console.log('🚀 Starting Voting Verification...')

    try {
        // 1. Create Test User
        console.log('Creating test user...')
        const user = await prisma.user.create({
            data: {
                name: 'Voter Test',
                email: `voter-${Date.now()}@example.com`,
                password: 'password123',
                role: 'FRANCHISOR'
            }
        })

        // 2. Create Post
        console.log('Creating test post...')
        const post = await prisma.post.create({
            data: {
                title: 'Vote Test Post',
                content: 'Please vote on this.',
                // type: 'DISCUSSION',  // Field doesn't exist in Post model
                authorId: user.id
            }
        })

        // 3. Vote Up
        console.log('Voting up...')
        const vote = await prisma.vote.create({
            data: {
                type: 'UPVOTE',  // Use type enum instead of value
                userId: user.id,
                postId: post.id
            }
        })
        console.log(`✅ Voted up: ${vote.id}`)

        // 4. Verify Vote Count
        const postWithVotes = await prisma.post.findUnique({
            where: { id: post.id },
            include: { votes: true }
        })
        console.log(`Vote count: ${postWithVotes?.votes.length}`)

        if (postWithVotes?.votes.length === 1) {
            console.log('✅ Vote verified')
        } else {
            console.error('❌ Vote verification failed')
        }

        // Cleanup
        await prisma.vote.deleteMany({ where: { postId: post.id } })
        await prisma.post.delete({ where: { id: post.id } })
        await prisma.user.delete({ where: { id: user.id } })

    } catch (error) {
        console.error('❌ Verification Failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
