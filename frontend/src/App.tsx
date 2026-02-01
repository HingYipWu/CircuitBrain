import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login, Signup } from './pages/Auth';
import { CreatePost } from './pages/CreatePost';
import { TestConnection } from './pages/TestConnection';
import { CircuitBuilder } from './pages/CircuitBuilder';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/posts" element={<CreatePost />} />
          <Route path="/test" element={<TestConnection />} />
          <Route path="/circuit" element={<CircuitBuilder />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
