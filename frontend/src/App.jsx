import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Caixa from './pages/Caixa.jsx';
import Clientes from './pages/Clientes.jsx';
import Compras from './pages/Compras.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Estoque from './pages/Estoque.jsx';
import Fiscal from './pages/Fiscal.jsx';
import Fornecedores from './pages/Fornecedores.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import PDV from './pages/PDV.jsx';
import Produtos from './pages/Produtos.jsx';
import Relatorios from './pages/Relatorios.jsx';
import { isAuthenticated } from './services/session.js';

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/app" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="caixa" element={<Caixa />} />
          <Route path="pdv" element={<PDV />} />
          <Route path="fornecedores" element={<Fornecedores />} />
          <Route path="compras" element={<Compras />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="estoque" element={<Estoque />} />
          <Route path="fiscal" element={<Fiscal />} />
          <Route path="relatorios" element={<Relatorios />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated() ? '/app' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
