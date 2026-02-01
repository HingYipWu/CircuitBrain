import React, { useState, useEffect } from 'react';
import { postsAPI } from '../api';
import './Home.css';

interface Post {
  id: number;
  title: string;
  content: string;
  author: { id: number; name: string };
  createdAt: string;
}

export const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await postsAPI.getAll();
        setPosts(response.data);
      } catch (error) {
        console.error('Failed to fetch posts', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return <div className="loading">Loading posts...</div>;
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Welcome to CircuitBrain</h1>
        <p>Share your thoughts and ideas with the community</p>
      </div>

      <div className="posts-list">
        {posts.length === 0 ? (
          <p className="no-posts">No posts yet. Be the first to share!</p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="post-card">
              <h3>{post.title}</h3>
              <p className="post-content">{post.content}</p>
              <div className="post-meta">
                <span className="post-author">by {post.author.name}</span>
                <span className="post-date">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
