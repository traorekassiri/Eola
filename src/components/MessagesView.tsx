import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ImagePlus,
  Mic,
  MicOff,
  MoreVertical,
  Phone,
  PhoneOff,
  Search,
  Send,
  Smile,
  Square,
  Video,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ConversationSummary, MessageItem, UserProfile } from '../types';

export interface WsSignalEvent {
  event: string;
  payload: Record<string, unknown>;
}

interface MessagesViewProps {
  currentUser: UserProfile;
  initialConversationId: number | null;
  onViewProfile: (memberId: number) => void;
  onConversationsChanged: () => void;
  wsLastMessage: MessageItem | null;
  wsReadConversationId: number | null;
  wsSignalEvent: WsSignalEvent | null;
  sendWsEvent: (event: string, payload: Record<string, unknown>) => void;
}

const EMOJI_LIST = ['😊', '❤️', '🔥', '😍', '👋', '🌹', '✨', '😂', '🥰', '🙏'];

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  initialConversationId,
  onViewProfile,
  onConversationsChanged,
  wsLastMessage,
  wsReadConversationId,
  wsSignalEvent,
  sendWsEvent,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(initialConversationId);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // WebRTC call state
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callMode, setCallMode] = useState<'audio' | 'video'>('audio');
  const [callError, setCallError] = useState('');
  const [muted, setMuted] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const incomingConvRef = useRef<number | null>(null);

  // Report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Comportement inapproprié');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const loadConversations = useCallback(async () => {
    const data = await apiFetch<{ conversations: ConversationSummary[] }>('/api/messages/conversations');
    setConversations(data.conversations);
    if (!activeConvId && initialConversationId) {
      setActiveConvId(initialConversationId);
    } else if (!activeConvId && data.conversations.length > 0 && window.innerWidth >= 768) {
      setActiveConvId(data.conversations[0].id);
    }
  }, [activeConvId, initialConversationId]);

  const loadMessages = useCallback(
    async (convId: number) => {
      const data = await apiFetch<{ messages: MessageItem[] }>(`/api/messages/conversations/${convId}`);
      setMessages(data.messages);
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)));
      onConversationsChanged();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
    },
    [onConversationsChanged]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (initialConversationId) setActiveConvId(initialConversationId);
  }, [initialConversationId]);

  useEffect(() => {
    setPartnerTyping(false);
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    if (!wsLastMessage) return;
    if (wsLastMessage.conversation_id === activeConvId) {
      setPartnerTyping(false);
      setMessages((prev) => {
        if (prev.some((m) => m.id === wsLastMessage.id)) return prev;
        return [...prev, wsLastMessage];
      });
      loadMessages(activeConvId);
    } else {
      loadConversations();
    }
  }, [wsLastMessage, activeConvId, loadMessages, loadConversations]);

  useEffect(() => {
    if (wsReadConversationId && wsReadConversationId === activeConvId) {
      setMessages((prev) => prev.map((m) => (m.sender_id === currentUser.id ? { ...m, is_read: true } : m)));
    }
  }, [wsReadConversationId, activeConvId, currentUser.id]);

  const cleanupCall = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    incomingOfferRef.current = null;
    setCallState('idle');
    setMuted(false);
  }, []);

  // Handle typing & WebRTC signaling events
  useEffect(() => {
    if (!wsSignalEvent) return;
    const { event, payload } = wsSignalEvent;
    const convId = Number(payload.conversationId || 0);

    if (event === 'typing:start' && convId === activeConvId) {
      setPartnerTyping(true);
    } else if (event === 'typing:stop' && convId === activeConvId) {
      setPartnerTyping(false);
    } else if (event === 'call:offer') {
      incomingOfferRef.current = payload.sdp as RTCSessionDescriptionInit;
      incomingConvRef.current = convId;
      setCallMode((payload.mode as 'audio' | 'video') || 'audio');
      setCallState('incoming');
    } else if (event === 'call:answer' && peerRef.current) {
      peerRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
      setCallState('connected');
    } else if (event === 'call:ice' && peerRef.current && payload.candidate) {
      peerRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate as RTCIceCandidateInit)).catch(() => {});
    } else if (event === 'call:end' || event === 'call:reject') {
      cleanupCall();
    }
  }, [wsSignalEvent, activeConvId, cleanupCall]);

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;
  const filteredConvs = conversations.filter((c) =>
    c.partner.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleTyping = (val: string) => {
    setText(val);
    if (!activeConvId) return;
    sendWsEvent('typing:start', { conversationId: activeConvId });
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      sendWsEvent('typing:stop', { conversationId: activeConvId });
    }, 1800);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || (!text.trim() && !imageFile)) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append('content', text.trim());
      if (imageFile) form.append('image', imageFile);

      const data = await apiFetch<{ message: MessageItem }>(`/api/messages/conversations/${activeConvId}`, {
        method: 'POST',
        body: form,
      });

      sendWsEvent('typing:stop', { conversationId: activeConvId });
      setMessages((prev) => [...prev, data.message]);
      setText('');
      setImageFile(null);
      setShowEmojis(false);
      loadConversations();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
    } finally {
      setSending(false);
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    if (!activeConvId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
        setRecordSeconds(0);
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        if (blob.size < 500) return;
        const form = new FormData();
        form.append('audio', blob, 'vocal.webm');
        const data = await apiFetch<{ message: MessageItem }>(`/api/messages/conversations/${activeConvId}`, {
          method: 'POST',
          body: form,
        });
        setMessages((prev) => [...prev, data.message]);
        loadConversations();
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setCallError("Microphone inaccessible. Vérifiez les permissions du navigateur.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // WebRTC Call helpers
  const buildPeer = (convId: number) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendWsEvent('call:ice', { conversationId: convId, candidate: ev.candidate });
      }
    };
    pc.ontrack = (ev) => {
      if (remoteVideoRef.current && ev.streams[0]) {
        remoteVideoRef.current.srcObject = ev.streams[0];
      }
    };
    return pc;
  };

  const startCall = async (mode: 'audio' | 'video') => {
    if (!activeConvId) return;
    setCallError('');
    setCallMode(mode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = buildPeer(activeConvId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      peerRef.current = pc;
      setCallState('calling');
      sendWsEvent('call:offer', { conversationId: activeConvId, sdp: offer, mode });
    } catch {
      setCallError("Impossible d'accéder au microphone ou à la caméra pour démarrer l'appel.");
      cleanupCall();
    }
  };

  const acceptIncomingCall = async () => {
    const convId = incomingConvRef.current || activeConvId;
    if (!convId || !incomingOfferRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callMode === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = buildPeer(convId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      peerRef.current = pc;
      setCallState('connected');
      sendWsEvent('call:answer', { conversationId: convId, sdp: answer });
    } catch {
      setCallError("Permission microphone/caméra refusée.");
      cleanupCall();
    }
  };

  const endOrRejectCall = () => {
    const convId = incomingConvRef.current || activeConvId;
    if (convId) {
      sendWsEvent(callState === 'incoming' ? 'call:reject' : 'call:end', { conversationId: convId });
    }
    cleanupCall();
  };

  const handleBlock = async (partnerId: number) => {
    await apiFetch(`/api/users/${partnerId}/block`, { method: 'POST' });
    setMenuOpen(false);
    setActiveConvId(null);
    loadConversations();
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation) return;
    await apiFetch(`/api/users/${activeConversation.partner.id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason: reportReason, details: 'Signalé depuis la messagerie' }),
    });
    setReportOpen(false);
    setMenuOpen(false);
    setCallError('Signalement transmis à notre équipe de modération.');
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="zola-card overflow-hidden rounded-3xl grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-150px)] min-h-[540px]">
      <div
        className={`md:col-span-4 border-r border-white/8 flex flex-col ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-extrabold text-orange-400">Messages</h1>
            <span className="text-xs text-stone-400 tabular-nums">{conversations.length} discussion(s)</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une conversation..."
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {filteredConvs.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-400">
              Aucun Match pour le moment. Aimez des profils dans Découvrir pour démarrer une conversation !
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveConvId(conv.id)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5 ${
                  activeConvId === conv.id ? 'bg-white/8' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={conv.partner.avatar_url}
                    alt={conv.partner.full_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  {conv.partner.is_online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#120D0C]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-white truncate">
                      {conv.partner.first_name}
                    </span>
                    <span className="text-[11px] text-stone-400 tabular-nums shrink-0">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-xs text-stone-400 truncate">
                      {conv.last_message ||
                        (conv.last_message_audio
                          ? 'Message vocal'
                          : conv.last_message_image
                            ? 'Photo envoyée'
                            : 'Nouveau Match ! Dites bonjour')}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white tabular-nums">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div
        className={`md:col-span-8 flex flex-col bg-[#0F0B0A]/60 ${
          activeConvId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
            <p className="font-display text-lg font-semibold text-white">Sélectionnez une conversation</p>
            <p className="mt-1 text-sm">Vos échanges privés sont accessibles uniquement aux participants du Match.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden rounded-lg p-1.5 text-stone-300 hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewProfile(activeConversation.partner.id)}
                  className="flex items-center gap-3 text-left min-w-0"
                >
                  <img
                    src={activeConversation.partner.avatar_url}
                    alt={activeConversation.partner.first_name}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-white truncate">
                      {activeConversation.partner.first_name}
                    </p>
                    <p className="text-xs text-emerald-400">
                      {partnerTyping
                        ? "en train d'écrire..."
                        : activeConversation.partner.is_online
                          ? 'En ligne'
                          : 'Hors ligne'}
                    </p>
                  </div>
                </button>
              </div>

              <div className="relative flex items-center gap-1.5">
                <button
                  type="button"
                  title="Appel audio"
                  onClick={() => startCall('audio')}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-stone-300 hover:bg-white/10 hover:text-white"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Appel vidéo"
                  onClick={() => startCall('video')}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-stone-300 hover:bg-white/10 hover:text-white"
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-stone-300 hover:bg-white/10 hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-white/12 bg-[#1A1312] py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onViewProfile(activeConversation.partner.id);
                      }}
                      className="block w-full px-4 py-2 text-left text-xs text-stone-200 hover:bg-white/5"
                    >
                      Voir le profil
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="block w-full px-4 py-2 text-left text-xs text-amber-300 hover:bg-white/5"
                    >
                      Signaler ce membre
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBlock(activeConversation.partner.id)}
                      className="block w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Bloquer ce membre
                    </button>
                  </div>
                )}
              </div>
            </div>

            {callError && (
              <div className="flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-200">
                <span>{callError}</span>
                <button type="button" onClick={() => setCallError('')} className="underline ml-3">
                  Fermer
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const mine = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        mine
                          ? 'zola-gradient text-white rounded-br-sm'
                          : 'bg-[#1D1615] border border-white/8 text-stone-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Pièce jointe"
                          className="mb-2 max-h-60 rounded-xl object-cover"
                        />
                      )}
                      {msg.audio_url && (
                        <audio controls src={msg.audio_url} className="mb-1 max-w-[230px] h-9" />
                      )}
                      {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-white/80' : 'text-stone-400'}`}>
                        <span className="tabular-nums">{formatTime(msg.created_at)}</span>
                        {mine &&
                          (msg.is_read ? (
                            <CheckCheck className="h-3.5 w-3.5 text-amber-200" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="relative border-t border-white/8 p-3 space-y-2">
              {showEmojis && (
                <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#1B1413] p-2">
                  {EMOJI_LIST.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setText((t) => t + em)}
                      className="rounded-lg p-1.5 text-lg hover:bg-white/10"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {imageFile && (
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-1.5 text-xs text-stone-300">
                  <span className="truncate">Image prête : {imageFile.name}</span>
                  <button type="button" onClick={() => setImageFile(null)} className="text-red-400 ml-2">
                    Retirer
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Envoyer une photo"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300 hover:text-white"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmojis((v) => !v)}
                  title="Émoticônes"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300 hover:text-white"
                >
                  <Smile className="h-4 w-4" />
                </button>

                {recording ? (
                  <div className="flex flex-1 items-center justify-between rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                    <span className="tabular-nums">Enregistrement vocal... {recordSeconds}s</span>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-white font-semibold"
                    >
                      <Square className="h-3 w-3 fill-white" />
                      Envoyer
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => handleTyping(e.target.value)}
                      placeholder="Écrire un message..."
                      className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={startRecording}
                      title="Message vocal"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300 hover:text-white"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={sending}
                      aria-label="Envoyer"
                      className="zola-gradient zola-gradient-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md shadow-orange-600/30 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </form>
          </>
        )}
      </div>

      {/* WebRTC Call Overlay */}
      {callState !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="zola-card w-full max-w-md rounded-3xl p-6 text-center space-y-5">
            <h3 className="font-display text-xl font-bold text-white">
              {callState === 'calling' && `Appel ${callMode === 'video' ? 'vidéo' : 'audio'} en cours...`}
              {callState === 'incoming' && `Appel ${callMode === 'video' ? 'vidéo' : 'audio'} entrant`}
              {callState === 'connected' && 'Communication active'}
            </h3>

            {callMode === 'video' && (
              <div className="relative h-56 overflow-hidden rounded-2xl bg-black">
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute bottom-2 right-2 h-20 w-24 rounded-xl object-cover border border-white/20"
                />
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              {callState === 'incoming' ? (
                <>
                  <button
                    type="button"
                    onClick={acceptIncomingCall}
                    className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white"
                  >
                    Répondre
                  </button>
                  <button
                    type="button"
                    onClick={endOrRejectCall}
                    className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white"
                  >
                    Refuser
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      localStreamRef.current?.getAudioTracks().forEach((t) => {
                        t.enabled = muted;
                      });
                      setMuted((m) => !m);
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
                  >
                    {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={endOrRejectCall}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal inside chat */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={handleReportSubmit} className="zola-card w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-white">Signaler ce membre</h3>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3 py-2 text-sm text-white"
            >
              <option value="Comportement inapproprié">Comportement inapproprié</option>
              <option value="Harcèlement ou arnaque">Harcèlement ou arnaque</option>
              <option value="Profil suspect ou faux">Profil suspect ou faux</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs text-stone-300"
              >
                Annuler
              </button>
              <button type="submit" className="zola-gradient rounded-full px-4 py-2 text-xs font-semibold text-white">
                Envoyer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
