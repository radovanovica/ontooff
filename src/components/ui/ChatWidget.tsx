'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Fab,
  Paper,
  Typography,
  IconButton,
  TextField,
  CircularProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close,
  Send,
  Nature,
  SmartToy,
} from '@mui/icons-material';
import { useTranslation } from '@/i18n/client';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

interface HistoryPart {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SUGGESTIONS = [
  'What outdoor activities do you offer?',
  'How do I make a reservation?',
  'Find me a camping place',
  'Best fishing spots',
];

function MarkdownText({ text }: { text: string }) {
  // Minimal markdown: **bold**, *italic*, links [text](url), bullet lists
  const lines = text.split('\n');
  return (
    <Box component="span" sx={{ display: 'block' }}>
      {lines.map((line, i) => {
        // Bullet list
        if (line.match(/^[-*]\s/)) {
          return (
            <Box key={i} component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start', mt: 0.25 }}>
              <Box component="span" sx={{ mt: '2px', flexShrink: 0 }}>•</Box>
              <Box component="span">{renderInline(line.replace(/^[-*]\s/, ''))}</Box>
            </Box>
          );
        }
        // Empty line = paragraph spacing
        if (line.trim() === '') return <Box key={i} component="span" sx={{ display: 'block', height: 6 }} />;
        return <Box key={i} component="span" sx={{ display: 'block' }}>{renderInline(line)}</Box>;
      })}
    </Box>
  );
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold**, *italic*, [text](url)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Box key={i} component="span" sx={{ fontWeight: 700 }}>{part.slice(2, -2)}</Box>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <Box key={i} component="span" sx={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Box>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <Box
          key={i}
          component="a"
          href={linkMatch[2]}
          sx={{ color: '#2d5a27', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
        >
          {linkMatch[1]}
        </Box>
      );
    }
    return part;
  });
}

export default function ChatWidget() {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const getHistory = useCallback((): HistoryPart[] => {
    const completed = messages.filter((m) => !m.streaming);
    return completed.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    const history = getHistory();

    // Add an empty streaming assistant message
    setMessages((prev) => [...prev, { role: 'assistant', text: '', streaming: true }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Something went wrong.' }));
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', text: err.error ?? 'Something went wrong.', streaming: false };
          return next;
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const current = accumulated;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', text: current, streaming: true };
          return next;
        });
      }

      // Mark as done
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', text: accumulated, streaming: false };
        return next;
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', text: 'Connection error. Please try again.', streaming: false };
        return next;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, getHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: { xs: 72, sm: 88 },
            right: { xs: 12, sm: 24 },
            width: { xs: 'calc(100vw - 24px)', sm: 380 },
            maxWidth: 420,
            height: { xs: 'calc(100vh - 100px)', sm: 520 },
            maxHeight: 600,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1300,
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              bgcolor: '#2d5a27',
              color: 'white',
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
            }}
          >
            <SmartToy sx={{ fontSize: 22 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {t('chat.title', 'Outdoor Assistant')}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.65rem' }}>
                {t('chat.subtitle', 'Find places · Get tips · Plan your trip')}
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleClose} sx={{ color: 'white', p: 0.5 }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              px: 2,
              py: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              bgcolor: '#fafaf9',
            }}
          >
            {/* Welcome + suggestions */}
            {isEmpty && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: '#2d5a27',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    <Nature sx={{ fontSize: 16, color: 'white' }} />
                  </Box>
                  <Box
                    sx={{
                      bgcolor: 'white',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '4px 12px 12px 12px',
                      px: 1.5,
                      py: 1,
                      maxWidth: '85%',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {t('chat.welcome', "👋 Hi! I'm your outdoor activity assistant. I can help you find camping spots, fishing lakes, kayaking locations and more. What are you looking for?")}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, pl: 4.5 }}>
                  {SUGGESTIONS.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      size="small"
                      onClick={() => sendMessage(s)}
                      sx={{
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        bgcolor: 'white',
                        border: '1px solid',
                        borderColor: '#2d5a27',
                        color: '#2d5a27',
                        '&:hover': { bgcolor: '#f0f7ef' },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 1,
                  alignItems: 'flex-start',
                }}
              >
                {msg.role === 'assistant' && (
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: '#2d5a27',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    <Nature sx={{ fontSize: 16, color: 'white' }} />
                  </Box>
                )}

                <Box
                  sx={{
                    maxWidth: '80%',
                    px: 1.5,
                    py: 1,
                    borderRadius:
                      msg.role === 'user'
                        ? '12px 4px 12px 12px'
                        : '4px 12px 12px 12px',
                    bgcolor: msg.role === 'user' ? '#2d5a27' : 'white',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    border: msg.role === 'assistant' ? '1px solid' : 'none',
                    borderColor: 'divider',
                    fontSize: '0.85rem',
                    lineHeight: 1.55,
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      <MarkdownText text={msg.text || '…'} />
                      {msg.streaming && (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 6,
                            height: 12,
                            bgcolor: '#2d5a27',
                            borderRadius: '2px',
                            ml: 0.5,
                            animation: 'blink 1s step-end infinite',
                            '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.55, color: 'inherit' }}>
                      {msg.text}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}

            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box
            sx={{
              flexShrink: 0,
              px: 1.5,
              py: 1.25,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'white',
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end',
            }}
          >
            <TextField
              inputRef={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.inputPlaceholder', 'Ask about outdoor activities…')}
              multiline
              maxRows={3}
              size="small"
              fullWidth
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '0.85rem',
                },
              }}
            />
            <Tooltip title="Send">
              <span>
                <IconButton
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  size="small"
                  sx={{
                    bgcolor: '#2d5a27',
                    color: 'white',
                    borderRadius: 1.5,
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    '&:hover': { bgcolor: '#245120' },
                    '&.Mui-disabled': { bgcolor: 'grey.300', color: 'white' },
                  }}
                >
                  {loading ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <Send sx={{ fontSize: 18 }} />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Paper>
      )}

      {/* FAB trigger */}
      <Tooltip title={open ? '' : t('chat.fabTooltip', 'Chat with our assistant')} placement="left">
        <Fab
          onClick={() => setOpen((v) => !v)}
          sx={{
            position: 'fixed',
            bottom: { xs: 16, sm: 24 },
            right: { xs: 12, sm: 24 },
            zIndex: 1300,
            bgcolor: '#2d5a27',
            color: 'white',
            boxShadow: '0 4px 16px rgba(45,90,39,0.4)',
            '&:hover': { bgcolor: '#245120' },
            width: 52,
            height: 52,
          }}
        >
          {open ? <Close /> : <ChatIcon />}
        </Fab>
      </Tooltip>
    </>
  );
}
