// ============================================================
// Abrigo Nossa Senhora Aparecida — lógica da doação
//
// Pagamento via Pix, usando o Mercado Pago.
// O Access Token do Mercado Pago NUNCA fica neste arquivo — ele
// mora só nas variáveis de ambiente da Vercel. Este script chama
// as funções serverless em /api/create-pix-payment (gera o QR
// Code) e /api/check-payment-status (confere se já foi pago).
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const amountButtons = document.querySelectorAll(".amount-btn");
  const customInput = document.getElementById("custom-amount");
  const donateForm = document.getElementById("donate-form");

  const donateSection = document.getElementById("doar");
  const paySection = document.getElementById("pagamento");
  const payAmountEl = document.getElementById("pay-amount-value");
  const payBackBtn = document.getElementById("pay-back");
  const donorEmailInput = document.getElementById("donor-email");

  const qrLoadingEl = document.getElementById("pay-qr-loading");
  const qrImageEl = document.getElementById("pay-qr-image");
  const pixCopyWrapperEl = document.getElementById("pix-copy-wrapper");
  const pixCodeInput = document.getElementById("pix-code");
  const pixCopyBtn = document.getElementById("pix-copy-btn");
  const payStatusEl = document.getElementById("pay-status");

  let selectedAmount = null;
  let statusPollInterval = null;

  function selectAmount(value, btn) {
    selectedAmount = value;
    amountButtons.forEach((b) => b.classList.remove("is-selected"));
    if (btn) btn.classList.add("is-selected");
    if (customInput) customInput.value = "";
  }

  amountButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = parseFloat(btn.dataset.value);
      selectAmount(value, btn);
    });
  });

  if (customInput) {
    customInput.addEventListener("input", () => {
      amountButtons.forEach((b) => b.classList.remove("is-selected"));
      const value = parseFloat(customInput.value.replace(",", "."));
      selectedAmount = isNaN(value) ? null : value;
    });
  }

  if (donateForm) {
    donateForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!selectedAmount || selectedAmount <= 0) {
        alert("Escolha um valor ou digite quanto você quer doar. 🙂");
        return;
      }

      const email = donorEmailInput ? donorEmailInput.value.trim() : "";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Digite um e-mail válido para receber a confirmação da doação. 🙂");
        donorEmailInput?.focus();
        return;
      }

      iniciarPagamento(selectedAmount, email);
    });
  }

  // ------------------------------------------------------------
  // Carrossel "antes e depois" (spotlight)
  // ------------------------------------------------------------
  const spotlight = document.getElementById("spotlight-carousel");
  if (spotlight) {
    const slides = spotlight.querySelectorAll(".spotlight-slide");
    const dots = spotlight.querySelectorAll(".spotlight-dot");
    const prevBtn = document.getElementById("spotlight-prev");
    const nextBtn = document.getElementById("spotlight-next");
    let current = 0;

    function showSlide(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
      dots.forEach((d, i) => d.classList.toggle("is-active", i === current));
    }

    prevBtn.addEventListener("click", () => showSlide(current - 1));
    nextBtn.addEventListener("click", () => showSlide(current + 1));
    dots.forEach((dot, i) => dot.addEventListener("click", () => showSlide(i)));

    // Alterna automaticamente a cada 4s entre antes/depois
    setInterval(() => showSlide(current + 1), 4000);
  }

  // ------------------------------------------------------------
  // Carrossel de fotos
  // ------------------------------------------------------------
  const track = document.getElementById("carousel-track");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");

  if (track && prevBtn && nextBtn) {
    const scrollAmount = () => {
      const item = track.querySelector(".carousel-item");
      return item ? item.getBoundingClientRect().width + 16 : 240;
    };
    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -scrollAmount() * 2, behavior: "smooth" });
    });
    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: scrollAmount() * 2, behavior: "smooth" });
    });
  }

  if (payBackBtn) {
    payBackBtn.addEventListener("click", () => {
      paySection.classList.remove("is-visible");
      pararVerificacaoStatus();
      donateSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (pixCopyBtn) {
    pixCopyBtn.addEventListener("click", async () => {
      if (!pixCodeInput.value) return;
      try {
        await navigator.clipboard.writeText(pixCodeInput.value);
        const textoOriginal = pixCopyBtn.textContent;
        pixCopyBtn.textContent = "Copiado!";
        setTimeout(() => (pixCopyBtn.textContent = textoOriginal), 2000);
      } catch {
        pixCodeInput.select();
      }
    });
  }

  // ------------------------------------------------------------
  // Integração real com o Mercado Pago (Pix)
  // ------------------------------------------------------------
  async function iniciarPagamento(valor, email) {
    if (payAmountEl) payAmountEl.textContent = formatarValor(valor);

    // Reseta a tela de pagamento para o estado "carregando"
    qrImageEl.hidden = true;
    qrImageEl.removeAttribute("src");
    pixCopyWrapperEl.hidden = true;
    qrLoadingEl.hidden = false;
    qrLoadingEl.textContent = "Gerando QR Code Pix…";
    setStatus("Assim que o pagamento for confirmado, você recebe a confirmação automaticamente.");

    donateSection.scrollIntoView({ behavior: "instant" in window ? "instant" : "auto" });
    paySection.classList.add("is-visible");
    paySection.scrollIntoView({ behavior: "smooth" });

    try {
      const resposta = await fetch("/api/create-pix-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor, email }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível gerar o Pix.");
      }

      qrLoadingEl.hidden = true;
      qrImageEl.src = `data:image/png;base64,${dados.qr_code_base64}`;
      qrImageEl.hidden = false;

      pixCodeInput.value = dados.qr_code;
      pixCopyWrapperEl.hidden = false;

      setStatus("Aguardando a confirmação do pagamento…");
      iniciarVerificacaoStatus(dados.id);
    } catch (erro) {
      qrLoadingEl.hidden = false;
      qrLoadingEl.textContent = "Não deu para gerar o QR Code.";
      setStatus(erro.message || "Algo deu errado ao gerar o Pix. Tente novamente.", "error");
    }
  }

  function iniciarVerificacaoStatus(paymentId) {
    pararVerificacaoStatus();
    let tentativas = 0;
    const MAX_TENTATIVAS = 90; // ~6 minutos, verificando a cada 4s

    statusPollInterval = setInterval(async () => {
      tentativas += 1;
      if (tentativas > MAX_TENTATIVAS) {
        pararVerificacaoStatus();
        setStatus("Ainda não identificamos o pagamento. Se você já pagou, pode levar alguns minutos.");
        return;
      }

      try {
        const resposta = await fetch(`/api/check-payment-status?id=${paymentId}`);
        if (!resposta.ok) return;
        const dados = await resposta.json();

        if (dados.status === "approved") {
          pararVerificacaoStatus();
          setStatus("Pagamento confirmado! Muito obrigado por ajudar os animais do abrigo. 🐾", "success");
        } else if (dados.status === "cancelled" || dados.status === "rejected") {
          pararVerificacaoStatus();
          setStatus("O pagamento não foi concluído. Você pode tentar novamente.", "error");
        }
      } catch {
        // Falha de rede momentânea: ignora e tenta de novo na próxima verificação.
      }
    }, 4000);
  }

  function pararVerificacaoStatus() {
    if (statusPollInterval) {
      clearInterval(statusPollInterval);
      statusPollInterval = null;
    }
  }

  function setStatus(texto, tipo) {
    if (!payStatusEl) return;
    payStatusEl.textContent = texto;
    payStatusEl.classList.remove("is-success", "is-error");
    if (tipo === "success") payStatusEl.classList.add("is-success");
    if (tipo === "error") payStatusEl.classList.add("is-error");
  }

  function formatarValor(valor) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
});
