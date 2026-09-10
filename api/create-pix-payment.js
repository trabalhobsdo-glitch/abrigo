// ============================================================
// /api/create-pix-payment
//
// Cria uma cobrança Pix no Mercado Pago (Payments API) e devolve
// o QR Code (imagem em base64) + o código "copia e cola".
//
// IMPORTANTE:
// O Access Token do Mercado Pago NUNCA fica neste arquivo nem no
// GitHub. Ele deve ser cadastrado como variável de ambiente na
// Vercel, com o nome MERCADOPAGO_ACCESS_TOKEN
// (Vercel > seu projeto > Settings > Environment Variables).
// ============================================================

const crypto = require("crypto");

const MIN_VALOR = 5;
const MAX_VALOR = 20000;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido." });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("MERCADOPAGO_ACCESS_TOKEN não configurado no ambiente.");
    return res.status(500).json({ erro: "Configuração de pagamento ausente no servidor." });
  }

  const body = req.body || {};
  const valor = Number(body.valor);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const nome = typeof body.nome === "string" ? body.nome.trim() : "Doador";

  if (!Number.isFinite(valor) || valor < MIN_VALOR || valor > MAX_VALOR) {
    return res.status(400).json({ erro: `Valor inválido. Escolha um valor entre R$ ${MIN_VALOR} e R$ ${MAX_VALOR}.` });
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValido) {
    return res.status(400).json({ erro: "Informe um e-mail válido para receber a confirmação da doação." });
  }

  const transactionAmount = Math.round(valor * 100) / 100;

  try {
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: transactionAmount,
        description: "Doação — Abrigo Nossa Senhora Aparecida",
        payment_method_id: "pix",
        payer: {
          email,
          first_name: nome,
        },
      }),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Erro Mercado Pago:", data);
      const mensagem = data?.message || "Não foi possível gerar o Pix agora. Tente novamente em instantes.";
      return res.status(mpResponse.status).json({ erro: mensagem });
    }

    const transactionData = data?.point_of_interaction?.transaction_data;

    if (!transactionData?.qr_code || !transactionData?.qr_code_base64) {
      console.error("Resposta do Mercado Pago sem dados de QR Code:", data);
      return res.status(502).json({ erro: "O Mercado Pago não retornou o QR Code. Tente novamente." });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: transactionData.qr_code,
      qr_code_base64: transactionData.qr_code_base64,
    });
  } catch (err) {
    console.error("Falha ao chamar o Mercado Pago:", err);
    return res.status(500).json({ erro: "Falha ao gerar o Pix. Tente novamente em instantes." });
  }
};
