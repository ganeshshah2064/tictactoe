import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Send, MessageCircle, Users } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatMessage {
  username: string;
  message: string;
  timestamp: string;
  room: string;
}

interface ChatBoxProps {
  room: string;
  username: string;
  socket: any;
  isGameStarted: boolean;
  players: string[];
}

const ChatBox: React.FC<ChatBoxProps> = ({ room, username, socket, isGameStarted, players }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: ChatMessage) => {
      console.log('New message received:', data);
      setMessages(prev => [...prev, data]);
    };

    const handleChatError = (data: { message: string }) => {
      console.error('Chat error:', data.message);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('chatError', handleChatError);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('chatError', handleChatError);
    };
  }, [socket]);

  const sendMessage = () => {
    console.log('sendMessage called:', { newMessage, socket: !!socket, room, username });
    if (newMessage.trim() && socket) {
      console.log('Emitting sendMessage:', { room, username, message: newMessage.trim() });
      socket.emit('sendMessage', {
        room,
        username,
        message: newMessage.trim()
      });
      setNewMessage('');
    } else {
      console.log('Cannot send message:', { hasMessage: !!newMessage.trim(), hasSocket: !!socket });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getPlayerColor = (playerUsername: string) => {
    if (players[0] === playerUsername) return 'text-red-600';
    if (players[1] === playerUsername) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full w-12 h-12 shadow-lg transition-all duration-200",
          isOpen ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
        )}
        size="sm"
      >
        {isOpen ? <MessageCircle className="w-5 h-5" /> : <Users className="w-5 h-5" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="absolute bottom-16 right-0 w-80 h-96 shadow-2xl border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Game Chat
              <Badge variant="secondary" className="text-xs">
                {players.length}/2
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-full">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-4">
                    {isGameStarted ? "Start chatting with your opponent!" : "Waiting for players to join..."}
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-2 rounded-lg text-sm",
                        msg.username === username
                          ? "bg-blue-100 ml-4 text-right"
                          : "bg-gray-100 mr-4"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("font-medium text-xs", getPlayerColor(msg.username))}>
                          {msg.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-800 break-words">{msg.message}</p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            {isGameStarted && (
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    maxLength={200}
                    className="text-sm"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    size="sm"
                    className="px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {newMessage.length}/200 characters
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChatBox;
