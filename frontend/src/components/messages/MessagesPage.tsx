import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import type { User } from '../../types';

interface MessagesPageProps {
  user: User | null;
  setShowAuthModal: (show: boolean) => void;
}

interface Conversation {
  id: string;
  other_user_name: string;
  last_message: string;
  last_message_time: string;
}

interface Message {
  id: string;
  sender_name: string;
  content: string;
  sent_at: string;
  type?: 'offer';
}

interface OfferData {
  price: string;
  quantity: string;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  user,
  setShowAuthModal
}) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerData, setOfferData] = useState<OfferData>({ price: '', quantity: '' });

  const mockConversations: Conversation[] = [
    {
      id: '1',
      other_user_name: 'Rajesh Kumar',
      last_message: 'Yes, I can provide bulk discount for 50kg orders',
      last_message_time: '2024-01-20T10:30:00Z'
    },
    {
      id: '2',
      other_user_name: 'Priya Vegetables',
      last_message: 'Fresh stock arriving tomorrow morning',
      last_message_time: '2024-01-20T09:15:00Z'
    }
  ];

  const mockMessages: Message[] = [
    {
      id: '1',
      sender_name: 'You',
      content: 'Hi, I need 50kg of basmati rice. Can you provide bulk discount?',
      sent_at: '2024-01-20T10:00:00Z'
    },
    {
      id: '2',
      sender_name: 'Rajesh Kumar',
      content: 'Yes, I can provide bulk discount for 50kg orders',
      sent_at: '2024-01-20T10:30:00Z'
    }
  ];

  const sendMessage = () => {
    if (!messageText.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender_name: 'You',
      content: messageText,
      sent_at: new Date().toISOString()
    };
    
    setMessages([...messages, newMessage]);
    setMessageText('');
  };

  const sendOffer = () => {
    if (!offerData.price || !offerData.quantity) return;
    
    const offerMessage: Message = {
      id: Date.now().toString(),
      sender_name: 'You',
      content: `Special Offer: ₹${offerData.price}/unit for ${offerData.quantity} units`,
      sent_at: new Date().toISOString(),
      type: 'offer'
    };
    
    setMessages([...messages, offerMessage]);
    setShowOfferModal(false);
    setOfferData({ price: '', quantity: '' });
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
              {mockConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv);
                    setMessages(mockMessages);
                  }}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedConversation?.id === conv.id ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-800">{conv.other_user_name}</h4>
                    <span className="text-xs text-gray-500">
                      {new Date(conv.last_message_time).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1">{conv.last_message}</p>
                </div>
              ))}
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
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_name === 'You' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          message.sender_name === 'You'
                            ? 'bg-orange-500 text-white'
                            : message.type === 'offer'
                            ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.sent_at).toLocaleTimeString()}
                        </p>
                        {message.type === 'offer' && message.sender_name !== 'You' && (
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
                  ))}
                </div>
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={sendMessage}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={offerData.quantity}
                  onChange={(e) => setOfferData({...offerData, quantity: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={sendOffer}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
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