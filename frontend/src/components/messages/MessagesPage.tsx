import React, { useState, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { apiClient } from '../../services/api';
import type { User, Conversation, Message } from '../../types';

interface MessagesPageProps {
  user: User | null;
  setShowAuthModal: (show: boolean) => void;
}

interface OfferData {
  price: string;
  quantity: string;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  user,
  setShowAuthModal
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerData, setOfferData] = useState<OfferData>({ price: '', quantity: '' });
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Load conversations on component mount
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.getConversations();
        setConversations(response.conversations);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user]);

  // Setup WebSocket connection for real-time messaging
  useEffect(() => {
    if (!user) return;

    const websocket = new WebSocket(`ws://65.2.22.213/ws/messages`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        
        // Add new message to current conversation if it matches
        if (selectedConversation && messageData.conv_id === selectedConversation.id) {
          setMessages(prev => [...prev, {
            id: messageData.id,
            sender_id: messageData.sender_id,
            sender_name: messageData.sender_name,
            content: messageData.content,
            sent_at: messageData.sent_at
          }]);
        }

        // Update conversation list with new last message
        setConversations(prev => prev.map(conv => 
          conv.id === messageData.conv_id 
            ? { 
                ...conv, 
                last_message: messageData.content,
                last_message_time: messageData.sent_at 
              }
            : conv
        ));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      websocket.close();
    };
  }, [user, selectedConversation]);

  // Load messages when conversation is selected
  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessagesLoading(true);
    
    try {
      const response = await apiClient.getMessages(conversation.id);
      setMessages(response.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Use mock messages as fallback
      setMessages([
        {
          id: '1',
          sender_id: user?.id || '',
          sender_name: 'You',
          content: `Hi, I need 50kg of basmati rice. Can you provide bulk discount?`,
          sent_at: new Date(Date.now() - 30 * 60000).toISOString()
        },
        {
          id: '2',
          sender_id: conversation.other_user_id,
          sender_name: conversation.other_user_name,
          content: 'Yes, I can provide bulk discount for 50kg orders',
          sent_at: new Date().toISOString()
        }
      ]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = () => {
    if (!messageText.trim() || !selectedConversation || !ws) return;
    
    const messageData = {
      type: 'message',
      conv_id: selectedConversation.id,
      content: messageText
    };

    try {
      ws.send(JSON.stringify(messageData));
      
      // Add message to local state immediately for better UX
      const newMessage: Message = {
        id: Date.now().toString(),
        sender_id: user?.id || '',
        sender_name: 'You',
        content: messageText,
        sent_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const sendOffer = () => {
    if (!offerData.price || !offerData.quantity || !selectedConversation || !ws) return;
    
    const offerMessage = {
      type: 'offer',
      conv_id: selectedConversation.id,
      content: `Special Offer: ₹${offerData.price}/unit for ${offerData.quantity} units`,
      price: parseFloat(offerData.price),
      qty: parseInt(offerData.quantity)
    };

    try {
      ws.send(JSON.stringify(offerMessage));
      
      // Add offer message to local state
      const newMessage: Message = {
        id: Date.now().toString(),
        sender_id: user?.id || '',
        sender_name: 'You',
        content: offerMessage.content,
        sent_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setShowOfferModal(false);
      setOfferData({ price: '', quantity: '' });
    } catch (error) {
      console.error('Failed to send offer:', error);
      alert('Failed to send offer');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view messages</h2>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-lg">Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Messages</h1>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden h-96 flex">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Conversations</h3>
            </div>
            <div className="overflow-y-auto h-full">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => handleConversationSelect(conv)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedConversation?.id === conv.id ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-gray-800">{conv.other_user_name}</h4>
                      <span className="text-xs text-gray-500">
                        {conv.last_message_time ? new Date(conv.last_message_time).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conv.last_message || 'No messages yet'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">{selectedConversation.other_user_name}</h3>
                  {user.is_supplier && (
                    <button
                      onClick={() => setShowOfferModal(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Send Offer
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
                    </div>
                  ) : (
                    messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            message.sender_id === user.id
                              ? 'bg-orange-400 text-white'
                              : message.content.includes('Special Offer')
                              ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.sent_at).toLocaleTimeString()}
                          </p>
                          {message.content.includes('Special Offer') && message.sender_id !== user.id && (
                            <div className="mt-2 space-x-2">
                              <button className="bg-green-500 text-white px-2 py-1 rounded text-xs">
                                Accept
                              </button>
                              <button className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageText.trim()}
                      className="bg-orange-300 hover:bg-orange-400 disabled:bg-gray-300 text-white p-2 rounded-lg"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Send Special Offer</h2>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={offerData.price}
                  onChange={(e) => setOfferData({...offerData, price: e.target.value})}
                  className="text-gray-600 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={offerData.quantity}
                  onChange={(e) => setOfferData({...offerData, quantity: e.target.value})}
                  className="text-gray-600 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={sendOffer}
                  disabled={!offerData.price || !offerData.quantity}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg"
                >
                  Send Offer
                </button>
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};