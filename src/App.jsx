// src/App.jsx - Main React application component
// Entry point for the Caribbean Government Service Portal

import React from 'react';
import ChatInterface from './components/ChatInterface';
import './styles/globals.css';

function App() {
  return (
    <div className="app">
      <ChatInterface />
    </div>
  );
}

export default App;