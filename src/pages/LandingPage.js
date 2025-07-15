import React, { useEffect, useState } from 'react';
import { Calculator, Atom, Zap } from 'lucide-react';
import ChatInterface from './ChatInterface';
import EmailCaptureModal from './EmailCaptureModal';
import './LandingPage.css';

const LandingPage = () => {
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [currentQuestionData, setCurrentQuestionData] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userHasEmail, setUserHasEmail] = useState(false);

  const subjects = [
    {
      name: 'Mathematics',
      icon: Calculator,
      description: 'Master calculus, algebra, geometry, and advanced mathematical concepts with AI-generated practice questions.',
      color: 'blue'
    },
    {
      name: 'Physics',
      icon: Zap,
      description: 'Explore mechanics, thermodynamics, electromagnetism, and modern physics through unlimited practice problems.',
      color: 'green'
    },
    {
      name: 'Chemistry',
      icon: Atom,
      description: 'Dive deep into organic, inorganic, and physical chemistry with personalized question sets.',
      color: 'red'
    }
  ];

  // Check user progress
  const checkUserProgress = async (sessionId) => {
    try {
      const response = await fetch('https://jeemasters-axbqdybwawf3ccbm.centralindia-01.azurewebsites.net/api/get-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserProgress(data.progress || {});
        setUserHasEmail(data.emailCaptured || false);
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  // Track visit on page load
  useEffect(() => {
    const trackVisit = async () => {
      // Check if session ID already exists in localStorage
      const existingSessionId = localStorage.getItem('jee_session_id');
      
      if (existingSessionId) {
        console.log('Session already exists:', existingSessionId);
        setButtonsEnabled(true); // Enable buttons immediately
        await checkUserProgress(existingSessionId); // Check progress
        return; // Don't make API call if session exists
      }

      // Only make API call if no session exists
      try {
        const response = await fetch('https://jeemasters-axbqdybwawf3ccbm.centralindia-01.azurewebsites.net/api/track-visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Store the sessionId in localStorage
          localStorage.setItem('jee_session_id', data.sessionId);
          console.log('Visit tracked:', data);
          setButtonsEnabled(true); // Enable buttons after session is created
        } else {
          console.error('Failed to track visit');
        }
      } catch (error) {
        console.error('Error tracking visit:', error);
      }
    };

    trackVisit();
  }, []);

  const getButtonState = (subject) => {
    const progress = userProgress[subject];
    if (!progress) {
      return { text: 'Try for Free', disabled: false, completed: false };
    }
    
    if (progress.attempted >= 5) {
      return { text: 'Completed', disabled: true, completed: true };
    }
    
    if (progress.attempted > 0) {
      return { text: `Continue (${progress.attempted}/5)`, disabled: false, completed: false };
    }
    
    return { text: 'Try for Free', disabled: false, completed: false };
  };

  const isAllSubjectsCompleted = () => {
    const allSubjects = ['Mathematics', 'Physics', 'Chemistry'];
    return allSubjects.every(subject => {
      const progress = userProgress[subject];
      return progress && progress.attempted >= 5;
    });
  };

  const shouldShowUpgradeButton = () => {
    return isAllSubjectsCompleted() && !userHasEmail;
  };

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  const handleUpgradeModalClose = () => {
    setShowUpgradeModal(false);
    
    // Update email status after successful submission
    setUserHasEmail(true);
  };

  const handleUpgradeEmailSubmit = async (emailData) => {
    // Same API call as before
    const sessionId = localStorage.getItem('jee_session_id');
    
    try {
      const response = await fetch('https://jeemasters-axbqdybwawf3ccbm.centralindia-01.azurewebsites.net/api/save-email', {
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
        console.log('Upgrade email saved successfully:', data);
      } else {
        console.error('Failed to save upgrade email');
      }
    } catch (error) {
      console.error('Error saving upgrade email:', error);
    }
    
    setShowUpgradeModal(false);
  };

  const handleTryForFree = async (subject) => {
    const buttonState = getButtonState(subject);
    
    if (buttonState.disabled) {
      console.log(`${subject} already completed`);
      return;
    }
    
    console.log(`Starting ${subject} practice`);
    
    // Get session ID from localStorage
    const sessionId = localStorage.getItem('jee_session_id');
    
    // Make API call with session ID and selected category
    try {
      const response = await fetch('https://jeemasters-axbqdybwawf3ccbm.centralindia-01.azurewebsites.net/api/try-for-free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          category: subject
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Try for free response:', data);
        
        // Set the question and category, then show chat interface
        if (data.question) {
          setCurrentQuestion(data.question);
          setSelectedCategory(subject);
          setCurrentQuestionData(data);
          setShowChat(true);
        }
      } else {
        console.error('Failed to process try for free request');
      }
    } catch (error) {
      console.error('Error with try for free API call:', error);
    }
  };

  const handleBackToHome = () => {
    setShowChat(false);
    setCurrentQuestion(null);
    setSelectedCategory(null);
    
    // Refresh progress when returning to home
    const sessionId = localStorage.getItem('jee_session_id');
    if (sessionId) {
      checkUserProgress(sessionId);
    }
  };

  // Show chat interface if we have a question
  if (showChat && currentQuestion && currentQuestionData) {
    return (
      <ChatInterface
        question={currentQuestion}
        category={selectedCategory}
        onBack={handleBackToHome}
        initialQuestionNumber={currentQuestionData.currentQuestion || 1}
      />
    );
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="container">
        <div className="hero-section">
          <h1 className="hero-title">
            Master JEE with
            <span className="hero-highlight">AI-Powered Practice</span>
          </h1>
          <p className="hero-description">
            Get unlimited, personalized questions generated by advanced AI. 
            Practice smarter, not harder, and ace your JEE exam with confidence.
          </p>
          <div className="hero-features">
            <div className="feature-item">
              <div className="feature-dot green"></div>
              <span>Unlimited Questions</span>
            </div>
            <div className="feature-separator"></div>
            <div className="feature-item">
              <div className="feature-dot blue"></div>
              <span>AI-Generated</span>
            </div>
            <div className="feature-separator"></div>
            <div className="feature-item">
              <div className="feature-dot yellow"></div>
              <span>Personalized</span>
            </div>
          </div>
        </div>

        {/* Subject Cards */}
        <div className="cards-grid">
          {subjects.map((subject, index) => {
            const Icon = subject.icon;
            return (
              <div
                key={subject.name}
                className={`subject-card ${subject.color}`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="card-content">
                  {/* Icon */}
                  <div className={`icon-container ${subject.color}`}>
                    <Icon className="subject-icon" />
                  </div>

                  {/* Subject Name */}
                  <h3 className="subject-title">{subject.name}</h3>

                  {/* Description */}
                  <p className="subject-description">{subject.description}</p>

                  {/* Try for Free Button */}
                  <button
                    onClick={() => handleTryForFree(subject.name)}
                    disabled={!buttonsEnabled || getButtonState(subject.name).disabled}
                    className={`try-button ${subject.color} ${
                      (!buttonsEnabled || getButtonState(subject.name).disabled) ? 'disabled' : ''
                    } ${getButtonState(subject.name).completed ? 'completed' : ''}`}
                  >
                    {!buttonsEnabled ? 'Loading...' : getButtonState(subject.name).text}
                    <span className="button-arrow">→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">Unlimited</div>
              <div className="stat-label">Practice Questions</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">AI-Powered</div>
              <div className="stat-label">Question Generation</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Available Practice</div>
            </div>
          </div>
          
          {/* Show upgrade button if all subjects completed AND email not captured, otherwise show community text */}
          {shouldShowUpgradeButton() ? (
            <div className="upgrade-section">
              <div className="upgrade-message">
                🎉 Congratulations! You've completed your free trial!
              </div>
              <button 
                className="upgrade-button" 
                onClick={handleUpgradeClick}
              >
                <span className="upgrade-text">Sign up Now to unlock unlimited access</span>
                <span className="upgrade-icon">🚀</span>
              </button>
            </div>
          ) : (
            <div className="community-text">
              <p>Join our rapidly growing community of ambitious JEE aspirants who are transforming their preparation with AI-powered learning. Together, we're redefining what's possible in exam preparation.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <p className="footer-main">© 2025 JEE Masters. All rights reserved.</p>
            <p className="footer-sub">
              Empowering students with AI-driven learning solutions for JEE success.
            </p>
          </div>
        </div>
      </footer>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <EmailCaptureModal
          isOpen={showUpgradeModal}
          onClose={handleUpgradeModalClose}
          onSubmit={handleUpgradeEmailSubmit}
        />
      )}
    </div>
  );
};

export default LandingPage;