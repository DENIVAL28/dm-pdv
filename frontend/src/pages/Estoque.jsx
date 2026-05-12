import React from 'react';
import { AlertTriangle, Box, PackageX, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeedbackBanner from '../components/FeedbackBanner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listProducts } from '../services/productService.js';
import { getStockStatus } from '../utils/formatters.js';

export default function Estoque() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [somenteCriticos, setSomenteCriticos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function carregarProdutos() {
    try {
      setLoading(true);
      setError('');
      const data = await listProducts();
      setProdutos(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  const termo = busca.trim().toLowerCase();
  const produtosFiltrados = produtos.filter((produto) => {
    const status = getStockStatus(produto);
    const correspondeBusca =
      !termo ||
      produto.nome.toLowerCase().includes(termo) ||
      String(produto.codigo_barras || '').includes(termo);

    if (!correspondeBusca) {
      return false;
    }

    return somenteCriticos ? status.tone !== 'success' : true;
  });

  const estoqueBaixo = produtos.filter((produto) => getStockStatus(produto).tone === 'warning').length;
  const semEstoque = produtos.filter((produto) => getStockStatus(produto).tone === 'danger').length;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-title">
          <h2>Controle de estoque</h2>
          <p>Consulte saldo atual e identifique rupturas com rapidez.</p>
        </div>

        <Button type="button" variant="secondary" onClick={() => navigate('/produtos')}>
          Ajustar produtos
        </Button>
      </div>

      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}

      <div className="stats-grid">
        <Card title="Itens ativos" value={produtos.length} icon={Box} />
        <Card title="Estoque baixo" value={estoqueBaixo} icon={AlertTriangle} tone="warning" />
        <Card title="Sem estoque" value={semEstoque} icon={PackageX} tone="warning" />
      </div>

      {(estoqueBaixo || semEstoque) && !loading ? (
        <FeedbackBanner tone="info">
          {semEstoque
            ? `${semEstoque} item(ns) estao sem estoque e ${estoqueBaixo} item(ns) estao abaixo do minimo.`
            : `${estoqueBaixo} item(ns) estao abaixo do estoque minimo.`}
        </FeedbackBanner>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <h3>Lista de estoque</h3>
            <p>Use a busca para localizar por nome ou codigo de barras.</p>
          </div>

          <Button type="button" variant="secondary" onClick={carregarProdutos}>
            Atualizar
          </Button>
        </div>

        <div className="toolbar">
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar produto"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={somenteCriticos}
              onChange={(event) => setSomenteCriticos(event.target.checked)}
            />
            <span>Mostrar apenas itens com atencao</span>
          </label>
        </div>

        {loading ? (
          <div className="loading-state">Carregando estoque...</div>
        ) : produtosFiltrados.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Codigo</th>
                  <th>Estoque</th>
                  <th>Minimo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((produto) => {
                  const status = getStockStatus(produto);

                  return (
                    <tr key={produto.id}>
                      <td>{produto.nome}</td>
                      <td>{produto.codigo_barras || '-'}</td>
                      <td>{produto.estoque}</td>
                      <td>{produto.estoque_minimo}</td>
                      <td>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Ajuste os filtros ou cadastre novos produtos para comecar."
          />
        )}
      </section>
    </div>
  );
}
