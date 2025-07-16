import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import EmailCaptureModal from './EmailCaptureModal';
import './ChatInterface.css';

const ChatInterface = ({ question, category, onBack, initialQuestionNumber = 1 }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [greetingComplete, setGreetingComplete] = useState(false);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(initialQuestionNumber);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingNextQuestion, setPendingNextQuestion] = useState(null);
  const [optionsEnabled, setOptionsEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const messagesToShow = useMemo(() => [
    {
      type: 'greeting',
      text: `Welcome to JEE Masters! 🎉 Let's test your knowledge in ${category}. You have 5 carefully selected questions to solve. Good luck!`
    },
    {
      type: 'question',
      text: question.question,
      options: question.options,
      questionId: question.id
    }
  ], [category, question.question, question.options, question.id]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start with greeting message
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([{ ...messagesToShow[0], id: Date.now() }]);
      setCurrentMessageIndex(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [messagesToShow]);

  // Handle question message after greeting is complete + 2 second pause
  useEffect(() => {
    if (greetingComplete && currentMessageIndex === 1) {
      setIsTyping(true);
      
      const timer = setTimeout(async () => {
        setMessages(prev => [...prev, { ...messagesToShow[1], id: Date.now() + 1 }]);
        setIsTyping(false);
        
        // Wait for first question to finish typing, then enable options
        const questionTypingTime = messagesToShow[1].text.length * 40;
        await new Promise(resolve => setTimeout(resolve, questionTypingTime + 500));
        setOptionsEnabled(true);
      }, 2000); // 2 second pause after greeting completes

      return () => clearTimeout(timer);
    }
  }, [greetingComplete, currentMessageIndex, messagesToShow]);

  const handleGreetingComplete = () => {
    setGreetingComplete(true);
  };

  const addBotMessage = (type, text, additionalData = {}) => {
    const message = {
      type,
      text,
      id: Date.now() + Math.random(),
      ...additionalData
    };
    setMessages(prev => [...prev, message]);
    
    // Disable options when adding a new question
    if (type === 'question') {
      setOptionsEnabled(false);
    }
  };

  const streamAnswerResponse = async (responseData) => {
    setIsProcessingAnswer(true);
    
    // 1. Stream right/wrong message
    setIsTyping(true);
    addBotMessage('result', responseData.message);
    
    // Wait for the message to finish typing (estimate based on text length)
    const messageTypingTime = responseData.message.length * 40; // 40ms per character
    await new Promise(resolve => setTimeout(resolve, messageTypingTime + 500));
    setIsTyping(false);
    
    // 2. Pause for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Stream explanation
    setIsTyping(true);
    const explanationText = `📚 Explanation: ${responseData.explanation}`;
    addBotMessage('explanation', explanationText);
    
    // Wait for explanation to finish typing
    const explanationTypingTime = explanationText.length * 25; // 25ms per character
    await new Promise(resolve => setTimeout(resolve, explanationTypingTime + 500));
    setIsTyping(false);
    
    // 4. Check if this was the 4th question and show email modal (only if email not captured)
    if (responseData.questionsAttempted === 4 && responseData.nextQuestion && !responseData.emailCaptured) {
      setPendingNextQuestion(responseData);
      setShowEmailModal(true);
      setIsProcessingAnswer(false);
      return; // Don't proceed to next question yet
    }
    
    // 5. Pause for 2 seconds, then continue with next question or completion
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await proceedToNextQuestion(responseData);
  };

  const proceedToNextQuestion = async (responseData) => {
    // Stream next question or completion message
    if (responseData.nextQuestion) {
      setCurrentQuestionNumber(prev => prev + 1);
      setIsTyping(true);
      addBotMessage('question', responseData.nextQuestion.question, {
        options: responseData.nextQuestion.options,
        questionId: responseData.nextQuestion.id
      });
      
      // Wait for question to finish typing
      const questionTypingTime = responseData.nextQuestion.question.length * 40;
      await new Promise(resolve => setTimeout(resolve, questionTypingTime + 500));
      setIsTyping(false);
      
      // Enable options after question finishes typing
      setOptionsEnabled(true);
      
    } else if (responseData.testComplete) {
      setIsTyping(true);
      addBotMessage('completion', responseData.finalMessage);
      
      // Wait for completion message to finish typing
      const completionTypingTime = responseData.finalMessage.length * 40;
      await new Promise(resolve => setTimeout(resolve, completionTypingTime + 500));
      setIsTyping(false);
      
      // Wait 3 seconds after completion message, then automatically go back to home
      setTimeout(() => {
        onBack();
      }, 3000);
    }
    
    setIsProcessingAnswer(false);
  };

  const handleEmailSubmit = async (emailData) => {
    console.log('Email data submitted:', emailData);
    
    // Get session ID from localStorage
    const sessionId = localStorage.getItem('jee_session_id');
    
    // Make API call to save email data
    try {
      const response = await fetch('https://jeemastersbackendv1-hrhza9hzccddhdbv.centralindia-01.azurewebsites.net/api/save-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          email: emailData.email,
          name: emailData.name
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Email saved successfully:', data);
      } else {
        console.error('Failed to save email');
      }
    } catch (error) {
      console.error('Error saving email:', error);
    }
    
    // Close modal and continue with the 5th question
    setShowEmailModal(false);
    
    if (pendingNextQuestion) {
      // Wait a moment, then proceed to the 5th question
      setTimeout(async () => {
        await proceedToNextQuestion(pendingNextQuestion);
        setPendingNextQuestion(null);
      }, 1000);
    }
  };

  const handleEmailModalClose = () => {
    setShowEmailModal(false);
    
    if (pendingNextQuestion) {
      // User closed without entering details, still proceed to 5th question
      setTimeout(async () => {
        await proceedToNextQuestion(pendingNextQuestion);
        setPendingNextQuestion(null);
      }, 500);
    }
  };

  const handleOptionClick = async (optionIndex, optionText) => {
    if (isProcessingAnswer || !optionsEnabled) return; // Prevent clicks if processing or options disabled
    
    // Disable options immediately after click
    setOptionsEnabled(false);
    
    // Add user's answer to chat
    const userMessage = {
      type: 'user-answer',
      text: `${String.fromCharCode(65 + optionIndex)}. ${optionText}`,
      id: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Get session ID from localStorage
    const sessionId = localStorage.getItem('jee_session_id');
    
    // Get the current question ID from the most recent question message
    const questionMessages = messages.filter(msg => msg.type === 'question');
    const currentQuestionMessage = questionMessages[questionMessages.length - 1];
    const questionId = currentQuestionMessage ? currentQuestionMessage.questionId : question.id;
    
    // Make API call to submit answer
    try {
      const response = await fetch('https://jeemastersbackendv1-hrhza9hzccddhdbv.centralindia-01.azurewebsites.net/api/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          questionId: questionId,
          selectedOption: optionIndex,
          selectedText: optionText
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Answer submitted:', data);
        
        // Stream the response messages
        await streamAnswerResponse(data);
      } else {
        console.error('Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          Back to Home
        </button>
        <div className="progress-indicator">
          <span className="progress-text">Question {currentQuestionNumber} of 5</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(currentQuestionNumber / 5) * 100}%` }}></div>
          </div>
        </div>
        <div className="category-badge">
          {category}
        </div>
      </div>

      {/* Chat Container */}
      <div className="chat-container" ref={chatContainerRef}>
        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              {message.type === 'greeting' && (
                <div className="bot-message">
                  <div className="bot-avatar">🤖</div>
                  <div className="message-content">
                    <TypewriterText 
                      text={message.text} 
                      speed={30}
                      onComplete={handleGreetingComplete}
                    />
                  </div>
                </div>
              )}
              
              {message.type === 'result' && (
                <div className="bot-message">
                  <div className="bot-avatar">🤖</div>
                  <div className="message-content">
                    <TypewriterText text={message.text} speed={40} />
                  </div>
                </div>
              )}
              
              {message.type === 'explanation' && (
                <div className="bot-message">
                  <div className="bot-avatar">📚</div>
                  <div className="message-content explanation">
                    <TypewriterText text={message.text} speed={25} />
                  </div>
                </div>
              )}
              
              {message.type === 'completion' && (
                <div className="bot-message">
                  <div className="bot-avatar">🎊</div>
                  <div className="message-content completion">
                    <TypewriterText text={message.text} speed={40} />
                  </div>
                </div>
              )}
              
              {message.type === 'question' && (
                <div className="bot-message">
                  <div className="bot-avatar">📝</div>
                  <div className="message-content">
                    <TypewriterText text={message.text} speed={40} />
                    <div className="options-container">
                      {message.options.map((option, index) => (
                        <button
                          key={index}
                          className="option-button"
                          onClick={() => handleOptionClick(index, option)}
                          disabled={isProcessingAnswer || !optionsEnabled}
                        >
                          <span className="option-letter">{String.fromCharCode(65 + index)}.</span>
                          <span className="option-text">{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {message.type === 'user-answer' && (
                <div className="user-message">
                  <div className="message-content">
                    {message.text}
                  </div>
                  <div className="user-avatar">👤</div>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="message typing">
              <div className="bot-message">
                <div className="bot-avatar">🤖</div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Email Capture Modal */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={handleEmailModalClose}
        onSubmit={handleEmailSubmit}
      />
    </div>
  );
};

// Typewriter effect component
const TypewriterText = ({ text, speed = 30, onComplete }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (currentIndex === text.length && onComplete) {
      // Call onComplete when typing is finished
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return <span>{displayText}</span>;
};

export default ChatInterface;
