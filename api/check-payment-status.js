// ============================================================
// /api/check-payment-status?id=NUMERO_DO_PAGAMENTO
//
// Consulta na API do Mercado Pago se o pagamento Pix já foi
// aprovado, para o site liberar a confirmação automática.
// ============================================================

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ erro: "Método não permitido." });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("MERCADOPAGO_ACCESS_TOKEN não configurado no ambiente.");
    return res.status(500).json({ erro: "Configuração de pagamento ausente no servidor." });
  }

  const id = req.query?.id;
  if (!id || !/^\d+$/.test(String(id))) {
    return res.status(400).json({ erro: "id de pagamento inválido." });
  }

  try {
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro ao consultar pagamento:", data);
      return res.status(mpResponse.status).json({ erro: "Não foi possível consultar o pagamento." });
    }

    return res.status(200).json({ status: data.status });
  } catch (err) {
    console.error("Falha ao consultar o Mercado Pago:", err);
    return res.status(500).json({ erro: "Falha ao consultar o pagamento." });
  }
};
