// src/components/TicketDisplay.jsx - Display completed service ticket
// Shows ticket details, validation results, and next steps

import React, { useState } from 'react';

const TicketDisplay = ({ ticketData, serviceDetails, validationResults }) => {
  const [showRawData, setShowRawData] = useState(false);
  
  const generateTrackingNumber = () => {
    if (ticketData._metadata?.created_at && serviceDetails?.service_id) {
      const timestamp = new Date(ticketData._metadata.created_at).getTime();
      return `TT-${serviceDetails.service_id}-${timestamp.toString(36).toUpperCase()}`;
    }
    return `TT-${serviceDetails?.service_id || 'SVC'}-${Date.now().toString(36).toUpperCase()}`;
  };
  
  const getValidationStatus = () => {
    if (!validationResults) {
      return { status: 'unknown', icon: '❓', message: 'Validation pending' };
    }
    
    if (validationResults.validation_passed) {
      return { 
        status: 'passed', 
        icon: '✅', 
        message: 'All Trinidad & Tobago requirements verified' 
      };
    } else {
      return { 
        status: 'failed', 
        icon: '⚠️', 
        message: `${validationResults.errors?.length || 0} validation issue(s) found` 
      };
    }
  };
  
  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const getFieldIcon = (fieldName) => {
    const iconMap = {
      'full_name': '👤',
      'date_of_birth': '📅',
      'nationality': '🇹🇹',
      'phone': '📞',
      'email': '📧',
      'address': '🏠',
      'id_number': '🆔',
      'service_type': '📋',
      'license_class': '🚗',
      'business_name': '🏢',
      'business_type': '💼',
      'owner_name': '👨‍💼',
      'tax_id': '💰',
      'parent_name': '👨‍👩‍👧‍👦',
      'registration_number': '📝',
      'property_address': '🏠',
      'property_type': '🏘️',
      'deed_number': '📜',
      'land_area': '📐'
    };
    return iconMap[fieldName] || '📄';
  };
  
  const validationStatus = getValidationStatus();
  const trackingNumber = generateTrackingNumber();
  
  // Filter out metadata from display
  const displayData = Object.entries(ticketData)
    .filter(([key]) => !key.startsWith('_'))
    .sort(([a], [b]) => a.localeCompare(b));
  
  return (
    <div className="ticket-display-container">
      {/* Ticket Header */}
      <div className="ticket-header">
        <div className="ticket-header-content">
          <div className="ticket-icon">🎫</div>
          <div className="ticket-title-section">
            <h3 className="ticket-title">Service Request Submitted</h3>
            <p className="ticket-subtitle">{serviceDetails?.service_name}</p>
          </div>
          <div className="ticket-status">
            <span className="status-icon">{validationStatus.icon}</span>
          </div>
        </div>
        
        <div className="tracking-section">
          <div className="tracking-number">
            <span className="tracking-label">Tracking Number:</span>
            <span className="tracking-value">{trackingNumber}</span>
            <button 
              className="copy-tracking"
              onClick={() => navigator.clipboard?.writeText(trackingNumber)}
              title="Copy tracking number"
            >
              📋
            </button>
          </div>
        </div>
      </div>
      
      {/* Service Information */}
      <div className="service-info-section">
        <h4 className="section-title">📋 Service Information</h4>
        <div className="service-info-grid">
          <div className="info-item">
            <span className="info-label">Service:</span>
            <span className="info-value">{serviceDetails?.service_name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Ministry:</span>
            <span className="info-value">{serviceDetails?.ministry}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Processing Time:</span>
            <span className="info-value">{serviceDetails?.processing_time || 'TBD'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Fee:</span>
            <span className="info-value">{serviceDetails?.fee || 'TBD'}</span>
          </div>
        </div>
      </div>
      
      {/* Submitted Data */}
      <div className="submitted-data-section">
        <h4 className="section-title">📝 Submitted Information</h4>
        <div className="data-grid">
          {displayData.map(([fieldName, value]) => (
            <div key={fieldName} className="data-item">
              <div className="data-field">
                <span className="field-icon">{getFieldIcon(fieldName)}</span>
                <span className="field-name">{formatFieldName(fieldName)}</span>
              </div>
              <div className="data-value">{value}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Validation Results */}
      {validationResults && (
        <div className="validation-section">
          <h4 className="section-title">
            {validationStatus.icon} Trinidad & Tobago Validation
          </h4>
          
          <div className="validation-summary">
            <div className={`validation-status ${validationStatus.status}`}>
              <span className="validation-message">{validationStatus.message}</span>
            </div>
            
            {validationResults.validation_summary && (
              <div className="validation-stats">
                <span className="stat">
                  {validationResults.validation_summary.total_fields_checked} fields checked
                </span>
                <span className="stat">
                  {validationResults.validation_summary.errors_found} errors
                </span>
                <span className="stat">
                  {validationResults.validation_summary.warnings_found} warnings
                </span>
              </div>
            )}
          </div>
          
          {/* Validation Errors */}
          {validationResults.errors && validationResults.errors.length > 0 && (
            <div className="validation-errors">
              <h5>Issues Found:</h5>
              <ul className="error-list">
                {validationResults.errors.map((error, index) => (
                  <li key={index} className="error-item">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Improvement Suggestions */}
          {validationResults.improvement_suggestions && (
            <div className="improvement-suggestions">
              <h5>Suggestions:</h5>
              <ul className="suggestion-list">
                {validationResults.improvement_suggestions.map((suggestion, index) => (
                  <li key={index} className="suggestion-item">
                    <span className="suggestion-icon">💡</span>
                    <span className="suggestion-text">
                      <strong>{suggestion.field}:</strong> {suggestion.suggestion}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Next Steps */}
      <div className="next-steps-section">
        <h4 className="section-title">🚀 Next Steps</h4>
        <div className="steps-list">
          <div className="step-item">
            <span className="step-number">1</span>
            <div className="step-content">
              <span className="step-title">Keep Your Tracking Number</span>
              <span className="step-description">
                Save {trackingNumber} for future reference
              </span>
            </div>
          </div>
          
          <div className="step-item">
            <span className="step-number">2</span>
            <div className="step-content">
              <span className="step-title">Processing Time</span>
              <span className="step-description">
                Your request will be processed within {serviceDetails?.processing_time || 'the standard timeframe'}
              </span>
            </div>
          </div>
          
          <div className="step-item">
            <span className="step-number">3</span>
            <div className="step-content">
              <span className="step-title">Contact Ministry</span>
              <span className="step-description">
                For updates, contact {serviceDetails?.ministry}
              </span>
            </div>
          </div>
          
          {serviceDetails?.fee && serviceDetails.fee !== 'TBD' && (
            <div className="step-item">
              <span className="step-number">4</span>
              <div className="step-content">
                <span className="step-title">Payment Required</span>
                <span className="step-description">
                  Fee: {serviceDetails.fee} (payment instructions will be provided)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Raw Data Toggle */}
      <div className="raw-data-section">
        <button 
          className="toggle-raw-data"
          onClick={() => setShowRawData(!showRawData)}
        >
          {showRawData ? '🔼 Hide' : '🔽 Show'} Technical Details
        </button>
        
        {showRawData && (
          <div className="raw-data-content">
            <pre className="raw-data-display">
              {JSON.stringify({
                ticket_data: ticketData,
                service_details: serviceDetails,
                validation_results: validationResults
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      <div className="ticket-footer">
        <button 
          className="print-ticket"
          onClick={() => window.print()}
        >
          🖨️ Print Ticket
        </button>
        
        <button 
          className="new-request"
          onClick={() => window.location.reload()}
        >
          ➕ New Request
        </button>
      </div>
    </div>
  );
};

export default TicketDisplay;