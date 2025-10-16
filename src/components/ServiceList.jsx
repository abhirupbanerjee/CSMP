// src/components/ServiceList.jsx - Display available government services
// Shows all 5 services with details and selection capability

import React from 'react';

const ServiceList = ({ services, onServiceSelect }) => {
  
  const getServiceIcon = (serviceId) => {
    switch (serviceId) {
      case 'SVC_001':
        return '🛂'; // Passport
      case 'SVC_002':
        return '🚗'; // Driver License
      case 'SVC_003':
        return '🏢'; // Business Permit
      case 'SVC_004':
        return '📄'; // Birth Certificate
      case 'SVC_005':
        return '🏠'; // Property Registration
      default:
        return '📋';
    }
  };
  
  const getMinistryIcon = (ministry) => {
    if (ministry.includes('Home Affairs')) return '🏛️';
    if (ministry.includes('Transportation')) return '🚦';
    if (ministry.includes('Commerce')) return '💼';
    if (ministry.includes('Lands')) return '🏞️';
    return '🏢';
  };
  
  const formatProcessingTime = (time) => {
    if (!time || time === 'TBD') return 'Processing time varies';
    return `Processing: ${time}`;
  };
  
  const formatFee = (fee) => {
    if (!fee || fee === 'TBD') return 'Fee varies';
    return `Fee: ${fee}`;
  };
  
  return (
    <div className="service-list-container">
      <div className="service-list-header">
        <h3 className="service-list-title">
          🏛️ Available Government Services
        </h3>
        <p className="service-list-subtitle">
          Select a service to get started with your application
        </p>
      </div>
      
      <div className="services-grid">
        {services.map((service) => (
          <div 
            key={service.service_id}
            className="service-card"
            onClick={() => onServiceSelect(service)}
          >
            {/* Service Header */}
            <div className="service-header">
              <span className="service-icon">
                {getServiceIcon(service.service_id)}
              </span>
              <div className="service-title-section">
                <h4 className="service-title">{service.service_name}</h4>
                <span className="service-id">{service.service_id}</span>
              </div>
            </div>
            
            {/* Service Description */}
            <div className="service-description">
              <p>{service.description}</p>
            </div>
            
            {/* Ministry Info */}
            <div className="service-ministry">
              <span className="ministry-icon">
                {getMinistryIcon(service.ministry)}
              </span>
              <span className="ministry-name">{service.ministry}</span>
            </div>
            
            {/* Service Details */}
            <div className="service-details">
              <div className="detail-item">
                <span className="detail-icon">⏱️</span>
                <span className="detail-text">
                  {formatProcessingTime(service.processing_time)}
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-icon">💰</span>
                <span className="detail-text">
                  {formatFee(service.fee)}
                </span>
              </div>
            </div>
            
            {/* Action Button */}
            <div className="service-action">
              <button className="select-service-button">
                <span className="button-icon">▶️</span>
                <span className="button-text">Start Application</span>
              </button>
            </div>
            
            {/* Hover Effect Overlay */}
            <div className="service-card-overlay">
              <div className="overlay-content">
                <span className="overlay-icon">🚀</span>
                <span className="overlay-text">Click to begin</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Service Summary */}
      <div className="service-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-number">{services.length}</span>
            <span className="stat-label">Services Available</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-number">
              {[...new Set(services.map(s => s.ministry))].length}
            </span>
            <span className="stat-label">Government Ministries</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-number">🇹🇹</span>
            <span className="stat-label">Trinidad & Tobago</span>
          </div>
        </div>
        
        <div className="summary-note">
          <p>
            💡 <strong>Tip:</strong> Each service has specific requirements. 
            I'll guide you through the application process step by step.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceList;