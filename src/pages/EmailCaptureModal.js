import React, { useState } from 'react';
import { X, Mail, User, TrendingUp, Award, Target } from 'lucide-react';
import './EmailCaptureModal.css';

const EmailCaptureModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      // Don't call onClose() here since onSubmit should handle the modal closing
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '' });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          <X size={20} />
        </button>
        
        <div className="modal-content">
          {/* Header with achievement */}
          <div className="modal-header">
            <div className="achievement-badge">
              <Award className="achievement-icon" />
              <span>4/5 Completed!</span>
            </div>
            <h2 className="modal-title">🎉 You're Almost There!</h2>
            <p className="modal-subtitle">
              Get your <strong>personalized performance analysis</strong> and see how you compare with 10,000+ JEE aspirants!
            </p>
          </div>

          {/* Benefits section */}
          <div className="benefits-grid">
            <div className="benefit-item">
              <TrendingUp className="benefit-icon" />
              <div>
                <h4>Performance Analytics</h4>
                <p>Detailed breakdown of your strengths & improvement areas</p>
              </div>
            </div>
            <div className="benefit-item">
              <Target className="benefit-icon" />
              <div>
                <h4>Personalized Study Plan</h4>
                <p>Custom recommendations based on your performance</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="capture-form">
            <div className="form-group">
              <div className="input-container">
                <User className="input-icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? 'error' : ''}
                />
              </div>
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <div className="input-container">
                <Mail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                />
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <button 
              onClick={handleSubmit}
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Getting Your Report...</span>
              ) : (
                <span>Get My Performance Report 🚀</span>
              )}
            </button>
          </div>

          {/* Trust signals */}
          <div className="trust-signals">
            <div className="trust-item">
              <span className="trust-number">0</span>
              <span className="trust-text">Spam Emails</span>
            </div>
          </div>

          {/* Privacy note */}
          <p className="privacy-note">
            🔒 We respect your privacy. Your email will only be used to send your personalized report.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailCaptureModal;