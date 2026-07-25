'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({ users: 0, comics: 0, chapters: 0, pages: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState('');

  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ id: null, username: '', password: '', role: 'USER' });

  useEffect(() => {
    if (isLoading) return;

    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    if (token) {
      fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setStatsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch admin stats:', err);
        setStatsLoading(false);
      });

      // Fetch Users
      fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setUsersLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch users:', err);
        setUsersLoading(false);
      });
    }
  }, [user, token, isLoading, router]);

  const handleSaveUser = async () => {
    try {
      const url = modalData.id 
        ? `/api/admin/users/${modalData.id}` 
        : '/api/admin/users';
      
      const method = modalData.id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: modalData.username,
          password: modalData.password || undefined,
          role: modalData.role
        })
      });

      if (!res.ok) throw new Error('Failed to save user');
      
      const savedUser = await res.json();
      
      if (modalData.id) {
        setUsers(users.map(u => u.id === savedUser.id ? savedUser : u));
      } else {
        setUsers([...users, savedUser]);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert('Error saving user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      alert('Error deleting user');
    }
  };

  // Poll for logs every 2 seconds
  useEffect(() => {
    if (!token || user?.role !== 'ADMIN') return;

    const fetchLogs = () => {
      fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setLogs(data.logs || ''))
      .catch(err => console.error('Failed to fetch logs:', err));
    };

    fetchLogs(); // initial fetch
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [user, token]);

  const handleScrape = async (source?: string) => {
    setScraping(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(source ? { source } : {})
      });
      const data = await res.json();
      setMessage(data.message || 'Scraping started!');
    } catch (error) {
      setMessage('Failed to start scraper.');
    } finally {
      setTimeout(() => setScraping(false), 2000); // Visual cooldown
    }
  };

  const handleStopScrape = async () => {
    setMessage('');
    try {
      const res = await fetch('/api/admin/scrape/stop', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessage(data.message || 'Scraping stopped!');
    } catch (error) {
      setMessage('Failed to stop scraper.');
    }
  };

  if (isLoading || statsLoading) {
    return (
      <main className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-28 pb-12">
      <div className="max-w-5xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-400">Manage the Comicly engine and view platform statistics.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {/* Stat Card 1 */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-center">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Total Users</span>
            <span className="text-4xl font-black text-white">{stats.users}</span>
          </div>
          {/* Stat Card 2 */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-center">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Comics Indexed</span>
            <span className="text-4xl font-black text-emerald-400">{stats.comics}</span>
          </div>
          {/* Stat Card 3 */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-center">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Chapters</span>
            <span className="text-4xl font-black text-white">{stats.chapters}</span>
          </div>
          {/* Stat Card 4 */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-center">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Pages Scraped</span>
            <span className="text-4xl font-black text-teal-400">{stats.pages}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-[#0a0a0c] border border-white/10 p-8 rounded-3xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Engine Controls</h2>
          <p className="text-gray-400 mb-8 max-w-xl leading-relaxed">
            Trigger a full background sync. The scraper will connect to AsuraScans, check for new comics, update existing ones, and download any missing pages.
          </p>

          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => handleScrape()}
              disabled={scraping}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {scraping ? 'Deploying...' : 'Sync All Sources'}
            </button>
            <button 
              onClick={() => handleScrape('Asura Scans')}
              disabled={scraping}
              className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 font-bold py-3 px-6 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              Sync Asura
            </button>
            <button 
              onClick={() => handleScrape('MangaDex')}
              disabled={scraping}
              className="bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 font-bold py-3 px-6 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              Sync MangaDex
            </button>
            <button 
              onClick={handleStopScrape}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 ml-auto text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
              Stop Sync
            </button>
          </div>

          {message && (
            <div className="mt-6 inline-block bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
              {message}
            </div>
          )}
        </div>

        {/* Live Logs Terminal */}
        <div className="bg-[#050505] border border-white/10 rounded-3xl overflow-hidden mt-8 shadow-2xl">
          <div className="bg-white/5 border-b border-white/10 px-6 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
              Live Scraper Logs
            </h3>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"></div>
            </div>
          </div>
          <div className="p-6 h-80 overflow-y-auto font-mono text-xs md:text-sm text-emerald-400/90 leading-relaxed bg-[#0a0a0c]">
            <pre className="whitespace-pre-wrap">{logs}</pre>
          </div>
        </div>

        {/* User Management Section */}
        <div className="mt-12 bg-[#0a0a0c] border border-white/10 p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
              <p className="text-gray-400">Create, edit, and remove user accounts.</p>
            </div>
            <button 
              onClick={() => {
                setModalData({ id: null, username: '', password: '', role: 'USER' });
                setIsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-500 text-sm uppercase tracking-wider">
                  <th className="pb-4 font-bold px-4">ID</th>
                  <th className="pb-4 font-bold px-4">Username</th>
                  <th className="pb-4 font-bold px-4">Role</th>
                  <th className="pb-4 font-bold px-4">Join Date</th>
                  <th className="pb-4 font-bold text-right px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading users...</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 text-gray-400">#{u.id}</td>
                      <td className="py-4 px-4 text-white font-bold">{u.username}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          u.role === 'ADMIN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-4 text-right flex justify-end gap-3">
                        <button 
                          onClick={() => {
                            setModalData({ id: u.id, username: u.username, password: '', role: u.role });
                            setIsModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111113] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <h2 className="text-2xl font-bold text-white mb-6">
              {modalData.id ? 'Edit User' : 'Create New User'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Username</label>
                <input 
                  type="text" 
                  value={modalData.username}
                  onChange={e => setModalData({...modalData, username: e.target.value})}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">
                  Password {modalData.id && <span className="text-gray-600 font-normal">(Leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  value={modalData.password}
                  onChange={e => setModalData({...modalData, password: e.target.value})}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Role</label>
                <select 
                  value={modalData.role}
                  onChange={e => setModalData({...modalData, role: e.target.value})}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-gray-300 font-bold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUser}
                className="flex-1 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
