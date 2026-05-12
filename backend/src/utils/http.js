export function createHttpError(status, message, details) {
  const error = new Error(message);
  error.status = status;

  if (details) {
    error.details = details;
  }

  return error;
}

export function sendSuccess(res, data, status = 200, meta) {
  const payload = {
    success: true,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(status).json(payload);
}

export function normalizeDatabaseError(error) {
  if (error?.status) {
    return error;
  }

  if (error?.code === 'ER_DUP_ENTRY') {
    if (error.message.includes('codigo_barras')) {
      return createHttpError(409, 'Ja existe um produto com esse codigo de barras.');
    }

    if (error.message.includes('email')) {
      return createHttpError(409, 'Ja existe um usuario com esse e-mail.');
    }

    return createHttpError(409, 'Ja existe um registro com esses dados.');
  }

  if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
    return createHttpError(409, 'Este registro nao pode ser removido porque possui movimentacoes vinculadas.');
  }

  if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
    return createHttpError(400, 'Um dos relacionamentos informados nao existe.');
  }

  return error;
}
