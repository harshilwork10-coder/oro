'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    MessageSquare,
    ThumbsUp,
    Search,
    Filter,
    Plus,
    Tag,
    User
} from 'lucide-react'
import CreatePostModal from '@/components/community/CreatePostModal'
import Link from 'next/link'

type Post = {
    id: string
    title: string
    content: string
    type: string
    tags: string | null
    createdAt: string
    author: {
        name: string
        role: string
    }
    _count: {
        comments: number
        votes: number
    }
    userVote: number
}



export default function CommunityPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [filter, setFilter] = useState('ALL')

    useEffect(() => {
        fetchPosts()
    }, [filter])

    const fetchPosts = async () => {
        setLoading(true)
        try {
            const url = filter === 'ALL'
                ? '/api/community/posts'
                : `/api/community/posts?type=${filter}`

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setPosts(data)
            }
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setLoading(false)
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'QUESTION': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            case 'BEST_PRACTICE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }
    }

    const handleVote = async (e: React.MouseEvent, postId: string) => {
        e.preventDefault() // Prevent navigation
        e.stopPropagation()

        try {
            const res = await fetch('/api/community/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, value: 1 })
            })

            if (res.ok) {
                fetchPosts()
            }
        } catch (error) {
            console.error('Error voting:', error)
        }
    }

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Community Hub</h1>
                    <p className="text-stone-400 mt-2">Connect, share, and learn from other franchise owners</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-900/20 transition-all font-medium flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    New Discussion
                </button>
            </div>

            <CreatePostModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchPosts}
            />

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center glass-panel p-4 rounded-xl">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                    <input
                        type="text"
                        placeholder="Search discussions..."
                        className="w-full pl-10 pr-4 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {['ALL', 'DISCUSSION', 'QUESTION', 'BEST_PRACTICE'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === type
                                ? 'bg-orange-600 text-white'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                }`}
                        >
                            {type.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feed */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 glass-panel rounded-xl border-dashed">
                        <MessageSquare className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-400">No discussions yet. Be the first to post!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <Link
                            href={`/dashboard/community/${post.id}`}
                            key={post.id}
                            className="block glass-panel p-6 rounded-xl hover:border-orange-500/30 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-gradient-to-br from-orange-600 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-900/20">
                                        <User className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-stone-100">{post.author.name}</p>
                                        <p className="text-xs text-stone-500">{new Date(post.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getTypeColor(post.type)}`}>
                                    {post.type.replace('_', ' ')}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-stone-100 mb-2 group-hover:text-orange-400 transition-colors">
                                {post.title}
                            </h3>
                            <p className="text-stone-400 line-clamp-2 mb-4">
                                {post.content}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-stone-800">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={(e) => handleVote(e, post.id)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${post.userVote === 1
                                            ? 'text-blue-400 bg-blue-500/20'
                                            : 'text-stone-500 hover:bg-stone-800'
                                            }`}
                                    >
                                        <ThumbsUp className={`h-4 w-4 ${post.userVote === 1 ? 'fill-current' : ''}`} />
                                        <span className="text-sm font-medium">{post._count.votes}</span>
                                    </button>
                                    <div className="flex items-center gap-1 text-stone-500">
                                        <MessageSquare className="h-4 w-4" />
                                        <span className="text-sm font-medium">{post._count.comments}</span>
                                    </div>
                                </div>
                                {post.tags && (
                                    <div className="flex gap-2">
                                        {post.tags.split(',').map((tag, i) => (
                                            <span key={i} className="flex items-center gap-1 text-xs text-stone-500 bg-stone-800/50 px-2 py-1 rounded-md">
                                                <Tag className="h-3 w-3" />
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
