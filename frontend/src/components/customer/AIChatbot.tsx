import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { MessageCircle, Send, X, Bot, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
}

interface AIChatbotProps {
  onClose: () => void;
  onCustomizationRequest?: (drinkName: string, suggestions: any) => void;
  resetOnClose?: boolean;
  userId?: string | number | null;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ onClose, resetOnClose = false, userId }) => {
  const storagePrefix = userId ? `aiChat.user.${userId}` : 'aiChat.guest';
  const keyIsOpen = `${storagePrefix}.isOpen`;
  const keyMessages = `${storagePrefix}.messages`;
  const keySession = `${storagePrefix}.sessionId`;

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem(keyIsOpen);
    return stored ? stored === 'true' : false;
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const raw = localStorage.getItem(keyMessages);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as (Omit<Message,'timestamp'> & { timestamp: string })[];
      return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch { return []; }
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(keySession));
  const { authenticated } = useAuth();
  const prevUserIdRef = useRef<typeof userId>(userId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const stripMarkdown = (text: string) => {
    try {
      let t = text || '';
      // Bold and italics
      t = t.replace(/\*\*(.*?)\*\*/g, '$1');
      t = t.replace(/\*(.*?)\*/g, '$1');
      t = t.replace(/__(.*?)__/g, '$1');
      t = t.replace(/_(.*?)_/g, '$1');
      // Inline code/backticks
      t = t.replace(/`{1,3}([^`]*?)`{1,3}/g, '$1');
      // Headings & list markers
      t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '');
      t = t.replace(/^\s*[-*+]\s+/gm, '• ');
      t = t.replace(/^\s*\d+\.\s+/gm, match => match.replace(/\d+\.\s+/, '• '));
      // Links [text](url) -> text
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
      return t;
    } catch {
      return text;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Persist UI state and content
  useEffect(() => {
    localStorage.setItem(keyIsOpen, String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    const serializable = messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() }));
    localStorage.setItem(keyMessages, JSON.stringify(serializable));
  }, [messages]);

  useEffect(() => {
    if (sessionId) localStorage.setItem(keySession, sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (isOpen) {
      loadMenuItems();
    }
  }, [isOpen]);

  // Reset chat when user logs out or switches identity
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    // If user logged out, clear stored chat for prior identity
    if (!authenticated) {
      try {
        // Remove all AI chat related keys (guest + any user-specific)
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '';
          if (k.startsWith('aiChat.')) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
      setMessages([]);
      setSessionId(null);
      setIsOpen(false);
    } else if (prevUserId !== userId) {
      // On user switch, start fresh session
      try {
        const prevPrefix = prevUserId ? `aiChat.user.${prevUserId}` : 'aiChat.guest';
        localStorage.removeItem(`${prevPrefix}.isOpen`);
        localStorage.removeItem(`${prevPrefix}.messages`);
        localStorage.removeItem(`${prevPrefix}.sessionId`);
      } catch {}
      setMessages([]);
      setSessionId(null);
      setIsOpen(false);
      prevUserIdRef.current = userId;
    }
  }, [authenticated, userId]);

  const loadMenuItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/menu`);
      const data = await response.json();
      
      if (data.success) {
        const availableItems = (data.menu || []).filter((item: MenuItem) => item.is_available);
        setMenuItems(availableItems);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const startChatSession = async () => {
    setIsOpen(true);
    if (messages.length === 0) {
      const welcome: Message = {
        id: '1',
        role: 'assistant',
        content: "Hello! I'm CaféIQ, your coffee shop AI assistant. I can help you with drink recommendations, customization suggestions, and answer any questions about our menu. What can I help you with today?",
        timestamp: new Date()
      };
      setMessages([welcome]);
    }

    if (!sessionId) {
      try {
        const res = await fetch(`${API_URL}/api/ai-chat/session/start`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: null, dietaryPreferences: {} })
        });
        const data = await res.json();
        if (data.success && data.sessionId) setSessionId(data.sessionId);
      } catch (e) {
        console.error('Error starting initial AI chat session:', e);
        console.warn('Falling back to local chatbot (session error):', e);
      }
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const outgoing = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    // Always refresh menu so new items are considered in fallback
    await loadMenuItems();

    // If backend session available, use it; otherwise try to start one now
    let activeSession = sessionId;
    if (!activeSession) {
      try {
        const res = await fetch(`${API_URL}/api/ai-chat/session/start`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: null, dietaryPreferences: {} })
        });
        const data = await res.json();
        if (data.success && data.sessionId) {
          activeSession = data.sessionId;
          setSessionId(data.sessionId);
        }
      } catch (e) {
        console.error('Error starting AI chat session:', e);
      }
    }

    if (activeSession) {
      try {
        const res = await fetch(`${API_URL}/api/ai-chat/session/${activeSession}/message`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: outgoing })
        });
        if (res.ok) {
          const data = await res.json();
          // Accept multiple possible response shapes to be robust
          const content = (data && (
            data.response?.content ||
            data.response?.message ||
            data.message?.content ||
            data.content
          )) as string | undefined;
          if (data?.success && content) {
            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsLoading(false);
            return;
          } else {
            console.warn('AI message: unexpected payload', data);
          }
        } else {
          console.warn('AI message: non-OK status', res.status, res.statusText);
        }

        // If not ok or missing response, attempt one automatic session reset + retry
        try {
          const startRes = await fetch(`${API_URL}/api/ai-chat/session/start`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: null, dietaryPreferences: {} })
          });
          const startData = await startRes.json();
          if (startData.success && startData.sessionId) {
            activeSession = startData.sessionId;
            setSessionId(startData.sessionId);
            try {
              const retryRes = await fetch(`${API_URL}/api/ai-chat/session/${activeSession}/message`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: outgoing })
              });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                const retryContent = (retryData && (
                  retryData.response?.content ||
                  retryData.response?.message ||
                  retryData.message?.content ||
                  retryData.content
                )) as string | undefined;
                if (retryData?.success && retryContent) {
                  const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: retryContent,
                    timestamp: new Date()
                  };
                  setMessages(prev => [...prev, aiMessage]);
                  setIsLoading(false);
                  return;
                }
              }
            } catch (retryErr) {
              console.error('AI message retry error:', retryErr);
            }
          } else {
            // Clear stale sessionId if we couldn't start a new one
            setSessionId(null);
            try { localStorage.removeItem(keySession); } catch {}
          }
        } catch (startErr) {
          console.error('AI session restart error:', startErr);
        }
      } catch (e) {
        console.error('AI message error:', e);
        console.warn('AI message fallback due to error:', e);
      }
    }

    // Fallback local response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getFallbackResponse(outgoing),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 400);
  };

  const getFallbackResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggestion')) {
      if (menuItems.length > 0) {
        const coffeeItems = menuItems.filter(item => 
          item.category.toLowerCase().includes('coffee') || 
          item.category.toLowerCase().includes('espresso')
        );
        const specialtyItems = menuItems.filter(item => 
          item.category.toLowerCase().includes('specialty') || 
          item.category.toLowerCase().includes('signature')
        );
        
        let recommendations = "I'd be happy to recommend some drinks from our current menu! ";
        
        if (coffeeItems.length > 0) {
          recommendations += `For coffee lovers, I'd suggest our ${coffeeItems[0].name} (₱${coffeeItems[0].price}). `;
        }
        
        if (specialtyItems.length > 0) {
          recommendations += `For something special, try our ${specialtyItems[0].name} (₱${specialtyItems[0].price}). `;
        }
        
        recommendations += 'Would you like me to suggest customizations for any specific drink?';
        return recommendations;
      } else {
        return "I'd be happy to recommend some drinks! However, I don't see any menu items available right now. Please check back later or ask our staff for recommendations.";
      }
    }
    
    if (lowerMessage.includes('customize') || lowerMessage.includes('customization')) {
      if (menuItems.length > 0) {
        return 'Great question! We offer many customization options including different milk types (almond, oat, soy), syrups (vanilla, caramel, chocolate), and toppings. What drink would you like to customize? You can choose from our available menu items.';
      } else {
        return "Great question! We offer many customization options, but I don't see any menu items available right now. Please check back later.";
      }
    }
    
    if (lowerMessage.includes('dietary') || lowerMessage.includes('allergy')) {
      return "We're committed to accommodating dietary needs! We offer dairy-free milk alternatives, sugar-free syrups, and can modify most drinks. What specific dietary requirements do you have?";
    }
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      if (menuItems.length > 0) {
        const minPrice = Math.min(...menuItems.map(item => item.price));
        const maxPrice = Math.max(...menuItems.map(item => item.price));
        return `Our drinks range from ₱${minPrice} for basic items to ₱${maxPrice} for specialty items. Customizations typically add ₱15-₱30. Would you like me to suggest some budget-friendly options from our current menu?`;
      } else {
        return "I don't have access to our current menu pricing right now. Please check with our staff for the most up-to-date prices.";
      }
    }
    
    if (lowerMessage.includes('menu') || lowerMessage.includes('what do you have')) {
      if (menuItems.length > 0) {
        const categories = [...new Set(menuItems.map(item => item.category))];
        const categoryList = categories.slice(0, 3).join(', ');
        return `We have a great selection! Our menu includes ${categoryList} and more. We currently have ${menuItems.length} items available. What type of drink are you in the mood for?`;
      } else {
        return "I don't see any menu items available right now. Please check back later or ask our staff for our current offerings.";
      }
    }
    
    if (lowerMessage.includes('latte') || lowerMessage.includes('cappuccino') || lowerMessage.includes('americano') || lowerMessage.includes('mocha') || lowerMessage.includes('macchiato')) {
      if (menuItems.length > 0) {
        const requestedDrink = lowerMessage.includes('latte') ? 'latte' : 
                              lowerMessage.includes('cappuccino') ? 'cappuccino' : 
                              lowerMessage.includes('americano') ? 'americano' : 
                              lowerMessage.includes('mocha') ? 'mocha' : 'macchiato';
        
        const availableDrink = menuItems.find(item => 
          item.name.toLowerCase().includes(requestedDrink)
        );
        
        if (availableDrink) {
          return `Great choice! We do have ${availableDrink.name} available for ₱${availableDrink.price}. Would you like me to suggest customizations for it?`;
        } else {
          return `I don't see ${requestedDrink} on our current menu, but we do have other great options! Would you like me to recommend something from what's available?`;
        }
      } else {
        return "I don't have access to our current menu right now. Please check with our staff for what's available.";
      }
    }
    
    return "That's an interesting question! I can help you with drink recommendations, customization options, dietary considerations, and general coffee knowledge. What would you like to know more about?";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getQuickSuggestions = () => {
    if (menuItems.length > 0) {
      return [
        'What drinks do you recommend?',
        'How can I customize my drink?',
        'What are your dairy-free options?',
        'Tell me about your coffee beans'
      ];
    } else {
      return [
        "What's on your menu today?",
        'Do you have any specials?',
        'What are your most popular items?',
        'Tell me about your coffee beans'
      ];
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setInputMessage(suggestion);
    setTimeout(() => {
      setInputMessage(suggestion);
      setTimeout(sendMessage, 100);
    }, 100);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50">
        <button
          onClick={startChatSession}
          className="bg-[#a87437] hover:bg-[#8f652f] text-white rounded-full w-14 h-14 sm:w-16 sm:h-16 shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center border-2 sm:border-4 border-white"
          title="Chat with CaféIQ Assistant"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-8 sm:right-8 z-50 flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-0">
      {/* Mobile backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 sm:hidden" 
        onClick={() => {
          if (resetOnClose) {
            setMessages([]);
            setSessionId(null);
            try {
              localStorage.removeItem(keyMessages);
              localStorage.removeItem(keySession);
            } catch {}
          }
          setIsOpen(false);
          if (onClose) onClose();
        }}
      />
      <div className="relative w-full max-w-[420px] h-[50vh] sm:h-[500px] min-h-[350px] sm:min-h-[500px] shadow-2xl border-0 bg-white rounded-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#a87437] to-[#8f652f] text-white p-3 sm:p-5 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Bot className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="font-semibold text-sm sm:text-lg truncate">Cafe Assistant</span>
            </div>
            <button
              onClick={() => {
                if (resetOnClose) {
                  setMessages([]);
                  setSessionId(null);
                  try {
                    localStorage.removeItem(keyMessages);
                    localStorage.removeItem(keySession);
                  } catch {}
                }
                setIsOpen(false);
                if (onClose) onClose();
              }}
              className="text-white hover:bg-white/20 p-1.5 sm:p-2 rounded-lg flex-shrink-0"
              title="Close chat"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-5 space-y-2 sm:space-y-4 bg-gray-50">
            {messages.map((message, idx) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[85%] rounded-xl p-2.5 sm:p-4 ${
                    message.role === 'user'
                      ? 'bg-[#a87437] text-white'
                      : 'bg-white text-gray-800 shadow-sm border'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && (
                      <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-[#a87437] mt-0.5 flex-shrink-0" />
                    )}
                    <div className="text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">{message.role === 'assistant' ? stripMarkdown(message.content) : message.content}</div>
                  </div>
                  {message.role === 'assistant' && (() => {
                    const prev = messages[idx - 1];
                    const askedPrice = prev && prev.role === 'user' && /price|prices|cost|how much/i.test(prev.content || '');
                    if (!askedPrice) return null;
                    return (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {authenticated ? (
                          <button
                            onClick={() => { window.location.href = '/customer/menu'; }}
                            className="text-xs sm:text-sm px-3 py-1.5 border border-[#a87437] text-[#a87437] rounded-lg hover:bg-[#f6efe7]"
                          >
                            Go to Menu
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => { window.location.href = '/customer-login'; /* keep as last resort; ideally use navigate if router available here */ }}
                              className="text-xs sm:text-sm px-3 py-1.5 border border-[#a87437] text-[#a87437] rounded-lg hover:bg-[#f6efe7]"
                            >
                              Log in to view menu
                            </button>
                            <button
                              onClick={() => { window.location.href = '/customer-signup'; }}
                              className="text-xs sm:text-sm px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                              Create an account
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })()}
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-[#f6efe7]' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 shadow-sm border rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#a87437]" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-[#a87437] rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-[#a87437] rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-2 h-2 bg-[#a87437] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && (
            <div className="p-2 sm:p-5 bg-white border-t">
              <div className="text-xs text-gray-600 mb-1.5 sm:mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Quick suggestions:
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {getQuickSuggestions().map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSuggestion(suggestion)}
                    className="text-xs h-5 sm:h-7 px-1.5 sm:px-2 hover:bg-[#f6efe7] hover:border-[#a87437] border border-gray-300 rounded-lg bg-white text-gray-700 transition-colors whitespace-nowrap"
                    title={suggestion}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-2 sm:p-5 bg-white border-t">
            <div className="flex gap-1.5 sm:gap-2">
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about drinks..."
                className="flex-1 text-sm sm:text-base border border-gray-300 rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
                disabled={isLoading}
                title="Type your message here"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-[#a87437] hover:bg-[#8f652f] text-white px-2.5 sm:px-4 py-1.5 sm:py-3 rounded-lg disabled:opacity-50 transition-colors flex-shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
