import { prisma } from './src/lib/prisma'

async function main() {
    console.log('🚀 Starting Community Features Verification...')

    try {
        // 1. Create Test User
        console.log('Creating test user...')
        const user = await prisma.user.create({
            data: {
                name: 'Community Tester',
                email: `comm-test-${Date.now()}@example.com`,
                password: 'password123',
                role: 'FRANCHISOR'
            }
        })

        // 2. Create Post
        console.log('Creating test post...')
        const post = await prisma.post.create({
            data: {
                title: 'How to increase revenue?',
                content: 'Looking for tips on upselling services.',
                type: 'QUESTION',
                tags: 'revenue,sales',
                authorId: user.id
            }
        })
        console.log(`✅ Created post: ${post.id}`)

        // 3. Create Comment
        console.log('Adding comment...')
        const comment = await prisma.comment.create({
            data: {
                content: 'Try bundling products with services!',
                postId: post.id,
                authorId: user.id
            }
        })
        console.log(`✅ Added comment: ${comment.id}`)

        // 4. Verify Data Retrieval
        console.log('Verifying retrieval...')
        const fetchedPost = await prisma.post.findUnique({
            where: { id: post.id },
            include: {
                comments: true,
                _count: { select: { comments: true } }
            }
        })

        if (fetchedPost && fetchedPost.comments.length > 0) {
            console.log('✅ Verified post and comments retrieval')
            console.log(`Post Title: ${fetchedPost.title}`)
            console.log(`Comment Count: ${fetchedPost._count.comments}`)
        } else {
            console.error('❌ Failed to retrieve post or comments')
        }

        // Cleanup
        await prisma.comment.deleteMany({ where: { postId: post.id } })
        await prisma.post.delete({ where: { id: post.id } })
        await prisma.user.delete({ where: { id: user.id } })

    } catch (error) {
        console.error('❌ Verification Failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
