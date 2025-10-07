// src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await api.post('/register', { nome, email, senha });
      alert('Cadastro realizado com sucesso! Faça o login.');
      navigate('/');
    } catch (error) {
      alert('Erro no cadastro. Verifique os dados.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Cadastro</h2>
        <form onSubmit={handleSubmit}>
          {/* Inputs e Labels com estilização Tailwind */}
          <div className="mb-4">
            <label className="block text-gray-700">Nome</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700">Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
          </div>
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
            Registrar
          </button>
        </form>
        <p className="text-center mt-4">
          Já tem uma conta? <Link to="/" className="text-blue-500 hover:underline">Faça login</Link>
        </p>
      </div>
    </div>
  );
}