import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Square } from 'lucide-react';
import { clsx } from 'clsx';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onStopGeneration?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = "Mesajınızı yazın...",
  disabled = false,
  onStopGeneration
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // TODO: Implement voice recording logic
    } else {
      // Start recording
      setIsRecording(true);
      // TODO: Implement voice recording logic
    }
  };

  const canSend = message.trim().length > 0 && !disabled && !isLoading;

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-3">
          {/* Voice recording button */}
          <button
            type="button"
            onClick={handleVoiceRecording}
            disabled={disabled}
            className={clsx(
              'flex-shrink-0 p-3 rounded-full transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
              isRecording
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={clsx(
                'w-full px-4 py-3 pr-12 rounded-2xl border border-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'resize-none scrollbar-thin',
                'placeholder-gray-500 text-gray-900',
                disabled && 'bg-gray-50 cursor-not-allowed'
              )}
              style={{
                minHeight: '48px',
                maxHeight: '150px'
              }}
            />

            {/* Character count */}
            {message.length > 0 && (
              <div className="absolute bottom-1 right-14 text-xs text-gray-400">
                {message.length}
              </div>
            )}
          </div>

          {/* Send/Stop button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="flex-shrink-0 p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              title="Üretimi durdur"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              className={clsx(
                'flex-shrink-0 p-3 rounded-full transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                canSend
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
              title="Mesaj gönder"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center justify-center mt-3 text-red-600">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse mr-2"></div>
            <span className="text-sm font-medium">Kaydediliyor...</span>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center mt-3 text-gray-600">
            <div className="typing-indicator mr-3">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
            <span className="text-sm">Ajan düşünüyor...</span>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Göndermek için Enter, yeni satır için Shift+Enter</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'w-2 h-2 rounded-full',
              disabled ? 'bg-red-400' : 'bg-green-400'
            )}></span>
            <span>{disabled ? 'Çevrimdışı' : 'Bağlı'}</span>
          </div>
        </div>
      </form>
    </div>
  );
};