import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '../types/agent';

interface UseSocketOptions {
  serverUrl?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const {
    serverUrl = 'http://localhost:3003',
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket<SocketEvents> | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    // Prevent double connection in React Strict Mode
    if (autoConnect && !socketRef.current && !isConnectingRef.current) {
      connect();
    }

    return () => {
      // Only disconnect if component is truly unmounting
      // React Strict Mode will call this twice, so we need to be careful
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnectingRef.current = false;
      }
    };
  }, [autoConnect, serverUrl]);

  const connect = () => {
    if (socketRef.current?.connected || isConnectingRef.current) {
      return;
    }

    try {
      isConnectingRef.current = true;
      
      socketRef.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current.on('connect', () => {
        setIsConnected(true);
        setConnectionError(null);
        isConnectingRef.current = false;
        onConnect?.();
      });

      socketRef.current.on('disconnect', (reason) => {
        setIsConnected(false);
        onDisconnect?.();

        // Auto-reconnect on unexpected disconnections
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect automatically
        } else {
          // Client or network issue, try to reconnect
          setTimeout(() => {
            if (socketRef.current && !socketRef.current.connected) {
              socketRef.current.connect();
            }
          }, 5000);
        }
      });

      socketRef.current.on('connect_error', (error) => {
        setIsConnected(false);
        setConnectionError(error.message);
        isConnectingRef.current = false;
        onError?.(error);
      });

      socketRef.current.on('error', (error) => {
        setConnectionError(error.message);
        onError?.(error);
      });

    } catch (error) {
      setConnectionError('Failed to initialize socket connection');
      isConnectingRef.current = false;
      onError?.(error);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  };

  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      (socketRef.current as any).emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const on = (event: string, callback: any) => {
    if (socketRef.current) {
      (socketRef.current as any).on(event, callback);
    }
  };

  const off = (event: string, callback?: any) => {
    if (socketRef.current) {
      if (callback) {
        (socketRef.current as any).off(event, callback);
      } else {
        (socketRef.current as any).off(event);
      }
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    connect,
    disconnect,
    emit,
    on,
    off
  };
};