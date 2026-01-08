'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useParams } from 'next/navigation'
import {
    MessageSquare,
    ThumbsUp,
    User,
    ArrowLeft,
    Send
} from 'lucide-react'
import Link from 'next/link'

type Comment = {
    id: string
    content: string
    createdAt: string
    author: {
        name: string
        role: string
    }
}

type PostDetail = {
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
    comments: Comment[]
    _count: {
        votes: number
    }
}

export default function PostDetailPage() {
    const { id } = useParams()
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [post, setPost] = useState<PostDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [newComment, setNewComment] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (id) fetchPost()
    }, [id])

    const fetchPost = async () => {
        try {
            const res = await fetch(`/api/community/posts/${id}`)
            if (res.ok) {
                const data = await res.json()
                setPost(data)
            }
        } catch (error) {
            console.error('Error fetching post:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newComment.trim()) return

        setSubmitting(true)
        try {
            const res = await fetch(`/api/community/posts/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment })
            })

            if (res.ok) {
                setNewComment('')
                fetchPost() // Refresh comments
            }
        } catch (error) {
            console.error('Error posting comment:', error)
        } finally {
            setSubmitting(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (!post) return <div className="p-8">Post not found</div>

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <Link href="/dashboard/community" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Community
            </Link>

            {/* Post Content */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{post.author.name}</span>
                            <span>•</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium uppercase">
                                {post.type.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="prose max-w-none text-gray-700 mb-8">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                </div>

                <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                        <ThumbsUp className="h-5 w-5" />
                        <span>{post._count.votes} Upvotes</span>
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 text-gray-600">
                        <MessageSquare className="h-5 w-5" />
                        <span>{post.comments.length} Comments</span>
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Discussion</h3>

                {/* Comment Form */}
                <form onSubmit={handleCommentSubmit} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add to the discussion..."
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                type="submit"
                                disabled={submitting || !newComment.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Send className="h-4 w-4" />
                                Comment
                            </button>
                        </div>
                    </div>
                </form>

                {/* Comments List */}
                <div className="space-y-4">
                    {post.comments.map((comment) => (
                        <div key={comment.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <User className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{comment.author.name}</p>
                                        <p className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
