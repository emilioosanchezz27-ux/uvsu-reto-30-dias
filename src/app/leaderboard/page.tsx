'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Plus, Link2, RefreshCw, Flame, Star, Zap, X, MoreHorizontal, LogOut, Trash2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getSession } from '@/lib/supabase-sync'
import {
  createGroup,
  joinGroupByCode,
  getMyGroups,
  getGroupLeaderboard,
  getFeedEvents,
  postFeedEvent,
  feedEventLabel,
  syncMemberChallengeId,
  leaveGroup,
  deleteGroup,
  LeaderboardEntry,
  FeedEvent,
} from '@/lib/groups'
import { useChallengeStore } from '@/store/challenge'
import BottomNav from '@/components/ui/BottomNav'

type Tab = 'ranking' | 'feed'

export default function LeaderboardPage() {
  const router = useRouter()
  const { challenge } = useChallengeStore()

  const [groups, setGroups] = useState<Array<{ id: string; name: string; inviteCode: string; memberCount: number; createdBy: string | null }>>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [feed, setFeed] = useState<FeedEvent[]>([])
  const [tab, setTab] = useState<Tab>('ranking')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showGroupMenu, setShowGroupMenu] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [modalError, setModalError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  useEffect(() => {
    async function init() {
      const session = await getSession()
      if (!session) {
        router.replace('/onboarding')
        return
      }
      setCurrentUserId(session.user.id)
      const myGroups = await getMyGroups()
      setGroups(myGroups)
      if (myGroups.length > 0) {
        setSelectedGroupId(myGroups[0].id)
      }
      setLoading(false)

      // Sincronizar challenge_id en todos los grupos donde sea null (fix bug Día 0)
      if (challenge?.id) {
        syncMemberChallengeId(challenge.id).catch(() => {})
      }
    }
    init()
  }, [router, challenge?.id])

  useEffect(() => {
    if (!selectedGroupId) return
    loadGroupData(selectedGroupId)
  }, [selectedGroupId])

  // Supabase Realtime: escuchar nuevos eventos en el feed
  useEffect(() => {
    if (!selectedGroupId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`feed:${selectedGroupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed', filter: `group_id=eq.${selectedGroupId}` },
        async () => {
          // Recargar feed y leaderboard al recibir nuevo evento
          const [newFeed, newLeaderboard] = await Promise.all([
            getFeedEvents(selectedGroupId),
            getGroupLeaderboard(selectedGroupId),
          ])
          setFeed(newFeed)
          setLeaderboard(newLeaderboard)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedGroupId])

  async function loadGroupData(groupId: string) {
    setRefreshing(true)
    const [lb, events] = await Promise.all([
      getGroupLeaderboard(groupId),
      getFeedEvents(groupId),
    ])
    setLeaderboard(lb)
    setFeed(events)
    setRefreshing(false)
  }

  async function handleCreateGroup() {
    setModalError('')
    const name = newGroupName.trim() || 'U vs U'
    try {
      // Pasar challenge?.id para que el creador aparezca con datos en el leaderboard
      const result = await createGroup(name, challenge?.id)
      if (!result) {
        setModalError('Error al crear el grupo. Inténtalo de nuevo.')
        return
      }
      const myGroups = await getMyGroups()
      setGroups(myGroups)
      setSelectedGroupId(result.id)
      setShowCreateModal(false)
      setNewGroupName('')
      await postFeedEvent(result.id, 'joined', null, { group_name: name })
    } catch (err) {
      console.error('[handleCreateGroup]', err)
      setModalError('Error inesperado. Inténtalo de nuevo.')
    }
  }

  async function handleLeaveGroup() {
    if (!selectedGroupId) return
    const ok = await leaveGroup(selectedGroupId)
    if (ok) {
      const myGroups = await getMyGroups()
      setGroups(myGroups)
      setSelectedGroupId(myGroups[0]?.id ?? null)
    }
    setShowLeaveConfirm(false)
    setShowGroupMenu(false)
  }

  async function handleDeleteGroup() {
    if (!selectedGroupId) return
    const ok = await deleteGroup(selectedGroupId)
    if (ok) {
      const myGroups = await getMyGroups()
      setGroups(myGroups)
      setSelectedGroupId(myGroups[0]?.id ?? null)
    }
    setShowDeleteConfirm(false)
    setShowGroupMenu(false)
  }

  async function handleJoinGroup() {
    setModalError('')
    if (joinCode.trim().length < 6) {
      setModalError('El código debe tener 6 caracteres.')
      return
    }
    const groupId = await joinGroupByCode(joinCode.trim(), challenge?.id)
    if (!groupId) {
      setModalError('Código inválido o ya eres miembro de este grupo.')
      return
    }
    const myGroups = await getMyGroups()
    setGroups(myGroups)
    setSelectedGroupId(groupId)
    setShowJoinModal(false)
    setJoinCode('')
  }

  function handleCopyInvite() {
    const group = groups.find(g => g.id === selectedGroupId)
    if (!group) return
    const url = `${window.location.origin}/join/${group.inviteCode}`
    navigator.clipboard.writeText(url)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  function getMedal(rank: number) {
    if (rank === 0) return '🥇'
    if (rank === 1) return '🥈'
    if (rank === 2) return '🥉'
    return `#${rank + 1}`
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-dvh">
        <div className="text-4xl animate-pulse">🏆</div>
      </div>
    )
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  return (
    <>
      <div className="flex flex-col min-h-dvh pb-20">
        {/* Header */}
        <header className="px-4 pt-8 pb-4 safe-top" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Leaderboard
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                title="Unirse con código"
              >
                <Link2 size={16} color="var(--accent-primary)" />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--accent-primary)' }}
                title="Crear grupo"
              >
                <Plus size={16} color="#000" />
              </button>
            </div>
          </div>

          {/* Selector de grupo */}
          {groups.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: selectedGroupId === g.id ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: selectedGroupId === g.id ? '#000' : 'var(--text-secondary)',
                    border: `1px solid ${selectedGroupId === g.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  }}
                >
                  {g.name} · {g.memberCount}
                </button>
              ))}
            </div>
          )}
        </header>

        {groups.length === 0 ? (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
            <div className="text-6xl">🏆</div>
            <div>
              <p className="font-black text-lg mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                ¡Compite con otros!
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Crea un grupo e invita a tus amigos, o únete con un código.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                Crear grupo
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                Unirme con código
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs + Refresh */}
            <div className="px-4 pt-3 pb-0 flex items-center justify-between">
              <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-card)' }}>
                {(['ranking', 'feed'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: tab === t ? 'var(--accent-primary)' : 'transparent',
                      color: tab === t ? '#000' : 'var(--text-secondary)',
                    }}
                  >
                    {t === 'ranking' ? 'Ranking' : 'Feed'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {selectedGroup && (
                  <button
                    onClick={handleCopyInvite}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                    style={{
                      background: copiedCode ? 'rgba(34,197,94,0.15)' : 'var(--bg-card)',
                      color: copiedCode ? 'var(--success)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {copiedCode ? '✓ Copiado' : `${selectedGroup.inviteCode}`}
                  </button>
                )}
                <button
                  onClick={() => selectedGroupId && loadGroupData(selectedGroupId)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <RefreshCw size={14} color="var(--text-secondary)" className={refreshing ? 'animate-spin' : ''} />
                </button>
                {selectedGroup && (
                  <button
                    onClick={() => setShowGroupMenu(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <MoreHorizontal size={14} color="var(--text-secondary)" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {tab === 'ranking' ? (
                <div className="space-y-2">
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                      <p className="text-sm">Aún no hay datos. ¡Sé el primero en avanzar!</p>
                    </div>
                  ) : (
                    leaderboard.map((entry, i) => (
                      <motion.div
                        key={entry.userId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl p-4"
                        style={{
                          background: entry.userId === currentUserId
                            ? 'rgba(245,166,35,0.12)'
                            : 'var(--bg-card)',
                          border: entry.userId === currentUserId
                            ? '1px solid rgba(245,166,35,0.4)'
                            : '1px solid var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Posición */}
                          <div className="w-8 text-center font-black text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {getMedal(i)}
                          </div>

                          {/* Avatar */}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}
                          >
                            {entry.avatarUrl
                              ? <img src={entry.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                              : entry.displayName[0]?.toUpperCase()
                            }
                          </div>

                          {/* Nombre + stats */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {entry.displayName}
                                {entry.userId === currentUserId && (
                                  <span className="ml-1 text-xs" style={{ color: 'var(--accent-primary)' }}>tú</span>
                                )}
                              </span>
                              <span
                                className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-bold"
                                style={{ background: 'rgba(245,166,35,0.2)', color: 'var(--accent-primary)' }}
                              >
                                Nv.{entry.level}
                              </span>
                            </div>
                            <div className="flex gap-3">
                              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <Zap size={10} color="var(--accent-primary)" />
                                {entry.totalXP} XP
                              </span>
                              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <Flame size={10} color="#f97316" />
                                {entry.currentStreak}d
                              </span>
                              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <Star size={10} color="var(--gold)" />
                                {entry.perfectDays}
                              </span>
                            </div>
                          </div>

                          {/* Día actual */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Día</p>
                            <p className="font-black text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent-primary)' }}>
                              {entry.dayNumber}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              ) : (
                /* Feed de actividad */
                <div className="space-y-2">
                  {feed.length === 0 ? (
                    <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                      <p className="text-sm">El feed está vacío. ¡Completa hábitos para aparecer aquí!</p>
                    </div>
                  ) : (
                    feed.map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}
                        >
                          {event.avatarUrl
                            ? <img src={event.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                            : event.displayName[0]?.toUpperCase()
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug">{feedEventLabel(event)}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {new Date(event.createdAt).toLocaleString('es-MX', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />

      {/* Modal: Crear grupo */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Crear grupo</h2>
                <button onClick={() => setShowCreateModal(false)}>
                  <X size={20} color="var(--text-secondary)" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Nombre del grupo (ej. Los Imparables)"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                maxLength={40}
                className="w-full px-4 py-3 rounded-xl text-sm mb-3"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
              />
              {modalError && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{modalError}</p>}
              <button
                onClick={handleCreateGroup}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                Crear
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Unirse con código */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowJoinModal(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Unirse al grupo</h2>
                <button onClick={() => setShowJoinModal(false)}>
                  <X size={20} color="var(--text-secondary)" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Código de invitación (ej. ABC123)"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl text-sm mb-3 font-mono tracking-widest uppercase"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                onKeyDown={e => e.key === 'Enter' && handleJoinGroup()}
              />
              {modalError && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{modalError}</p>}
              <button
                onClick={handleJoinGroup}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                Unirme
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Menú del grupo (abandonar / borrar) */}
      <AnimatePresence>
        {showGroupMenu && selectedGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowGroupMenu(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {selectedGroup.name}
                </h2>
                <button onClick={() => setShowGroupMenu(false)}>
                  <X size={20} color="var(--text-secondary)" />
                </button>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { setShowGroupMenu(false); setShowLeaveConfirm(true) }}
                  className="w-full py-3 rounded-xl flex items-center gap-3 px-4 text-sm font-semibold"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <LogOut size={16} color="var(--text-secondary)" />
                  Abandonar grupo
                </button>
                {selectedGroup.createdBy === currentUserId && (
                  <button
                    onClick={() => { setShowGroupMenu(false); setShowDeleteConfirm(true) }}
                    className="w-full py-3 rounded-xl flex items-center gap-3 px-4 text-sm font-semibold"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}
                  >
                    <Trash2 size={16} color="var(--danger)" />
                    Borrar grupo para todos
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Confirmar abandonar */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={20} color="var(--accent-primary)" />
                <h2 className="text-lg font-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>¿Abandonar grupo?</h2>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Ya no aparecerás en el leaderboard de <strong>{selectedGroup?.name}</strong>. Podrás volver a unirte con el código.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleLeaveGroup}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={{ background: 'var(--accent-primary)', color: '#000' }}
                >
                  Abandonar
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Confirmar borrar grupo */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={20} color="var(--danger)" />
                <h2 className="text-lg font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--danger)' }}>
                  ¿Borrar grupo?
                </h2>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Esto eliminará <strong>{selectedGroup?.name}</strong> para todos los miembros. Se perderá el historial del feed y el leaderboard del grupo. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteGroup}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={{ background: 'var(--danger)', color: '#fff' }}
                >
                  Sí, borrar
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
