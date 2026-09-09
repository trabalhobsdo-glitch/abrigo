// ============================================================
// Abrigo Nossa Senhora Aparecida — lógica da doação
//
// IMPORTANTE PARA QUEM FOR INTEGRAR O PAGAMENTO:
// Este arquivo só cuida da INTERFACE (escolher valor -> mostrar
// a tela de pagamento). Ele NÃO gera cobrança nenhuma ainda.
//
// Quando a chave Pix / conta Mercado Pago / Stripe estiver pronta,
// procure a função `iniciarPagamento(valor)` lá embaixo — é ali
// que deve entrar a chamada para gerar o QR Code/link de pagamento
// real (ex: criar uma "Preference" no Mercado Pago Checkout Pro,
// ou uma "Payment Link" na Stripe, e redirecionar ou exibir o QR
// code retornado pela API).
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const amountButtons = document.querySelectorAll(".amount-btn");
  const customInput = document.getElementById("custom-amount");
  const donateForm = document.getElementById("donate-form");

  const donateSection = document.getElementById("doar");
  const paySection = document.getElementById("pagamento");
  const payAmountEl = document.getElementById("pay-amount-value");
  const payBackBtn = document.getElementById("pay-back");

  let selectedAmount = null;

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

      iniciarPagamento(selectedAmount);
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
      donateSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  // ------------------------------------------------------------
  // Ponto de integração do pagamento real (Mercado Pago / Stripe)
  // ------------------------------------------------------------
  function iniciarPagamento(valor) {
    // Por enquanto só mostramos a segunda tela com o valor escolhido.
    // TODO (quando a chave Pix / conta estiver pronta):
    //   1. Chamar o backend/API que cria a cobrança
    //      (Mercado Pago "Checkout Pro" ou Stripe "Payment Link"),
    //      passando `valor` e uma referência do abrigo.
    //   2. Pegar o QR code / copia-e-cola Pix retornado.
    //   3. Substituir o conteúdo de `.qr-box` pela imagem do QR real
    //      e o texto abaixo pelo código copia-e-cola.
    if (payAmountEl) {
      payAmountEl.textContent = formatarValor(valor);
    }
    donateSection.scrollIntoView({ behavior: "instant" in window ? "instant" : "auto" });
    paySection.classList.add("is-visible");
    paySection.scrollIntoView({ behavior: "smooth" });
  }

  function formatarValor(valor) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
});
